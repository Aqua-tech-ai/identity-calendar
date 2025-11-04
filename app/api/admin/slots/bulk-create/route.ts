import "server-only";

import { Prisma } from "@prisma/client";
import { addDays, addMinutes, isBefore } from "date-fns";
import { formatInTimeZone, zonedTimeToUtc } from "date-fns-tz";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import { ensureAdmin } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";

const TIMEZONE = "Asia/Tokyo";
const SLOT_STATUS_AVAILABLE = "available";

const normalizeYmd = (value: string) => value.replaceAll("/", "-").trim();

const HHmm = z
  .string()
  .regex(/^\d{2}:\d{2}$/, { message: "時刻は HH:mm 形式で入力してください。" });

const BulkSchema = z.object({
  startDate: z.string().transform(normalizeYmd),
  endDate: z.string().transform(normalizeYmd),
  startTime: HHmm,
  endTime: HHmm,
  stepMinutes: z.coerce.number().int().positive(),
  weekdays: z
    .array(z.coerce.number().int().min(0).max(6))
    .min(1, "少なくとも1つの曜日を選択してください"),
  isPaidSlot: z
    .union([z.string(), z.number(), z.boolean()])
    .optional()
    .transform((value) => {
      if (typeof value === "boolean") return value;
      if (typeof value === "number") return value === 1;
      if (typeof value === "string") {
        const normalized = value.trim().toLowerCase();
        if (["true", "1", "yes", "on"].includes(normalized)) return true;
        if (["false", "0", "no", "off"].includes(normalized)) return false;
      }
      return Boolean(value);
    })
    .default(false),
});

const toMinutes = (time: string) => {
  const [hour, minute] = time.split(":").map(Number);
  return hour * 60 + minute;
};

const normalizeWeekdays = (value: unknown): number[] =>
  Array.isArray(value)
    ? value
        .map((entry) => {
          if (typeof entry === "number") return entry;
          if (typeof entry === "string" && entry.trim() !== "") return Number(entry);
          return null;
        })
        .filter(
          (entry): entry is number =>
            entry !== null && Number.isInteger(entry) && entry >= 0 && entry <= 6,
        )
    : [];

const toLocalUtc = (dateYmd: string, time: string) => {
  const isoLocal = `${dateYmd}T${time}:00`;
  return zonedTimeToUtc(isoLocal, TIMEZONE);
};

export async function POST(req: NextRequest) {
  const unauthorized = await ensureAdmin(req);
  if (unauthorized) {
    return unauthorized;
  }

  let requestBody: Record<string, unknown> = {};

  try {
    requestBody = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const parsed = BulkSchema.safeParse({
      ...requestBody,
      weekdays: normalizeWeekdays(requestBody.weekdays),
    });

    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          message: "入力が正しくありません。",
          errors: parsed.error.issues,
        },
        { status: 400 },
      );
    }

    const { startDate, endDate, startTime, endTime, stepMinutes, weekdays, isPaidSlot } =
      parsed.data;

    if (startDate > endDate) {
      return NextResponse.json(
        { ok: false, message: "開始日は終了日より前にしてください。" },
        { status: 400 },
      );
    }

    const startMinutes = toMinutes(startTime);
    const endMinutes = toMinutes(endTime);

    if (startMinutes >= endMinutes) {
      return NextResponse.json(
        { ok: false, message: "開始時刻は終了時刻より前にしてください。" },
        { status: 400 },
      );
    }

    const rangeStart = zonedTimeToUtc(`${startDate}T00:00:00`, TIMEZONE);
    const rangeEnd = zonedTimeToUtc(`${endDate}T00:00:00`, TIMEZONE);
    if (rangeStart.getTime() > rangeEnd.getTime()) {
      return NextResponse.json(
        { ok: false, message: "開始日は終了日より前にしてください。" },
        { status: 400 },
      );
    }

    const step = Math.max(5, Math.round(stepMinutes / 5) * 5);

    const candidates: Array<{
      startAt: Date;
      endAt: Date;
      status: string;
      isPaidSlot: boolean;
    }> = [];
    const seenKeys = new Set<string>();

    for (
      let cursor = new Date(rangeStart);
      cursor.getTime() <= rangeEnd.getTime();
      cursor = addDays(cursor, 1)
    ) {
      const weekdayIndex = Number(formatInTimeZone(cursor, TIMEZONE, "c")) - 1;
      const weekday = weekdayIndex < 0 ? 6 : weekdayIndex;
      if (!weekdays.includes(weekday)) continue;

      const localDate = formatInTimeZone(cursor, TIMEZONE, "yyyy-MM-dd");
      let current = toLocalUtc(localDate, startTime);
      const limit = toLocalUtc(localDate, endTime);

      while (isBefore(current, limit)) {
        const next = addMinutes(current, step);
        if (next.getTime() > limit.getTime()) break;

        const slotStart = new Date(current);
        const slotEnd = new Date(next);
        const key = `${slotStart.toISOString()}|${slotEnd.toISOString()}`;
        if (seenKeys.has(key)) {
          current = next;
          continue;
        }
        seenKeys.add(key);

        candidates.push({
          startAt: slotStart,
          endAt: slotEnd,
          status: SLOT_STATUS_AVAILABLE,
          isPaidSlot,
        });

        current = next;
      }
    }

    if (candidates.length === 0) {
      return NextResponse.json(
        { ok: false, message: "条件に一致する枠がありませんでした。", count: 0 },
        { status: 400 },
      );
    }

    const rangeStartBound = new Date(
      Math.min(...candidates.map((candidate) => candidate.startAt.getTime())),
    );
    const rangeEndBound = new Date(
      Math.max(...candidates.map((candidate) => candidate.endAt.getTime())),
    );

    const existingSlots = await prisma.slot.findMany({
      where: {
        startAt: {
          gte: rangeStartBound,
        },
        endAt: {
          lte: rangeEndBound,
        },
      },
      select: { startAt: true, endAt: true },
    });

    const existingKeys = new Set(
      existingSlots.map(
        (slot) => `${slot.startAt.toISOString()}|${slot.endAt.toISOString()}`,
      ),
    );

    const toCreate = candidates.filter((candidate) => {
      const key = `${candidate.startAt.toISOString()}|${candidate.endAt.toISOString()}`;
      return !existingKeys.has(key);
    });

    if (toCreate.length > 0) {
      await prisma.slot.createMany({
        data: toCreate.map((candidate) => ({
          startAt: candidate.startAt,
          endAt: candidate.endAt,
          status: candidate.status,
          isPaidSlot: candidate.isPaidSlot,
        })),
      });
    }

    return NextResponse.json({ ok: true, created: toCreate.length });
  } catch (error) {
    console.error("[bulk-create] failed", { error, body: requestBody });

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return NextResponse.json(
        {
          ok: false,
          message: "データベースエラーが発生しました。",
          errors: [{ code: error.code, message: error.message, meta: error.meta }],
        },
        { status: 500 },
      );
    }

    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      {
        ok: false,
        message,
        errors:
          error instanceof Error
            ? [{ message: error.message }]
            : [{ message: "Unknown error" }],
      },
      { status: 500 },
    );
  }
}
