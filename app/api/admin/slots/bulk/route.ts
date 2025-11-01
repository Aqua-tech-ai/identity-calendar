import "server-only";

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { addDays } from "date-fns";
import { formatInTimeZone, zonedTimeToUtc } from "date-fns-tz";

import { prisma } from "@/lib/prisma";
import { Env } from "@/lib/env";
import { ensureAdmin } from "@/lib/api-helpers";
import { SlotsBulkSchema } from "@/lib/validate";

const TIMEZONE = Env.TZ ?? "Asia/Tokyo";

function minutesFromTime(time: string) {
  const [hour, minute] = time.split(":").map(Number);
  return hour * 60 + minute;
}

export async function POST(req: NextRequest) {
  const unauthorized = await ensureAdmin(req);
  if (unauthorized) {
    return unauthorized;
  }

  const body = await req.json().catch(() => null);
  const parsed = SlotsBulkSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_payload", detail: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { startDate, endDate, startTime, endTime, slotMinutes, weekdays, isPaidSlot } =
    parsed.data;

  if (startDate > endDate) {
    return NextResponse.json(
      { error: "range_error", detail: "開始日が終了日より後です" },
      { status: 400 },
    );
  }

  const startMinutes = minutesFromTime(startTime);
  const endMinutes = minutesFromTime(endTime);
  const span = endMinutes - startMinutes;

  if (span <= 0) {
    return NextResponse.json(
      { error: "time_error", detail: "開始時刻が終了時刻以上です" },
      { status: 400 },
    );
  }

  if (span % slotMinutes !== 0) {
    return NextResponse.json(
      {
        error: "slot_mismatch",
        detail: `時間幅(${span}分)がスロット長(${slotMinutes}分)で割り切れません`,
      },
      { status: 400 },
    );
  }

  const startDayUtc = zonedTimeToUtc(`${startDate}T00:00:00`, TIMEZONE);
  const endDayUtc = zonedTimeToUtc(`${endDate}T00:00:00`, TIMEZONE);

  const candidates: Array<{
    startAt: string;
    endAt: string;
    label: string;
  }> = [];
  const duplicateLabels: string[] = [];
  const seenKeys = new Set<string>();

  for (let day = startDayUtc; day <= endDayUtc; day = addDays(day, 1)) {
    const weekdayIndex = Number(formatInTimeZone(day, TIMEZONE, "c")) - 1;
    const normalizedWeekday = weekdayIndex < 0 ? 6 : weekdayIndex;
    if (!weekdays.includes(normalizedWeekday)) continue;

    const localDate = formatInTimeZone(day, TIMEZONE, "yyyy-MM-dd");

    for (let offset = 0; offset < span; offset += slotMinutes) {
      const slotStartMinutes = startMinutes + offset;
      const slotEndMinutes = slotStartMinutes + slotMinutes;

      const startHour = Math.floor(slotStartMinutes / 60);
      const startMinute = slotStartMinutes % 60;
      const endHour = Math.floor(slotEndMinutes / 60);
      const endMinute = slotEndMinutes % 60;

      const startTimeStr = `${String(startHour).padStart(2, "0")}:${String(
        startMinute,
      ).padStart(2, "0")}`;
      const endTimeStr = `${String(endHour).padStart(2, "0")}:${String(endMinute).padStart(
        2,
        "0",
      )}`;

      const startAtIso = zonedTimeToUtc(`${localDate}T${startTimeStr}:00`, TIMEZONE).toISOString();
      const endAtIso = zonedTimeToUtc(`${localDate}T${endTimeStr}:00`, TIMEZONE).toISOString();

      const label = `${localDate} ${startTimeStr}`;
      const key = `${startAtIso}|${endAtIso}`;
      if (seenKeys.has(key)) {
        duplicateLabels.push(label);
        continue;
      }
      seenKeys.add(key);

      candidates.push({
        startAt: startAtIso,
        endAt: endAtIso,
        label,
      });
    }
  }

  if (candidates.length === 0) {
    return NextResponse.json(
      { error: "no_slots", detail: "条件に一致する枠がありませんでした" },
      { status: 400 },
    );
  }

  const existingSlots = await prisma.slot.findMany({
    where: {
      startAt: {
        in: candidates.map((c) => c.startAt),
      },
    },
    select: {
      startAt: true,
      endAt: true,
    },
  });

  const existingKeys = new Set(
    existingSlots.map((slot) => `${slot.startAt.toISOString()}|${slot.endAt.toISOString()}`),
  );

  const creatable = candidates.filter((candidate) => {
    const key = `${candidate.startAt}|${candidate.endAt}`;
    if (existingKeys.has(key)) {
      duplicateLabels.push(candidate.label);
      return false;
    }
    return true;
  });

  if (creatable.length > 0) {
    await prisma.slot.createMany({
      data: creatable.map((slot) => ({
        startAt: new Date(slot.startAt),
        endAt: new Date(slot.endAt),
        status: "available",
        isPaidSlot,
      })),
      skipDuplicates: true,
    });
  }

  return NextResponse.json({
    ok: true,
    createdCount: creatable.length,
    conflicts: duplicateLabels,
  });
}
