import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { notifyDiscord } from "@/lib/notify";
import { rateLimit } from "@/lib/rate-limit";
import { BookingCreateSchema } from "@/lib/validate";

const BOOKING_TYPE_VALUES = ["COACHING", "PRACTICE", "コーチング", "練習"] as const;

const ERROR_MESSAGES = {
  invalid_payload: "入力内容を確認してください。",
  discord_required: "コーチング予約には Discord ID が必要です。",
  slot_not_found: "選択した枠が見つかりませんでした。",
  slot_not_available: "この枠は予約できません。",
  duplicate_booking: "この枠はすでに予約されています。",
  server_error: "サーバーでエラーが発生しました。",
} as const;

type ErrorCode = keyof typeof ERROR_MESSAGES;

const normalizeBookingType = (value: string): "COACHING" | "PRACTICE" => {
  if (value === "COACHING" || value === "コーチング") return "COACHING";
  return "PRACTICE";
};

const errorResponse = (
  code: ErrorCode,
  status: number,
  extra?: Record<string, unknown>,
) =>
  NextResponse.json(
    {
      ok: false,
      code,
      message: ERROR_MESSAGES[code],
      ...(extra ?? {}),
    },
    { status },
  );

const formatTokyoDateTime = (value: Date) =>
  new Intl.DateTimeFormat("ja-JP", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Tokyo",
  }).format(value);

const toNullable = (value?: string | null) => {
  if (typeof value !== "string") return null;
  if (value.length === 0) return null;
  return value;
};

export async function POST(req: Request) {
  const ipHeader = req.headers.get("x-forwarded-for") || "";
  const ip = ipHeader.split(",")[0]?.trim() || "unknown";
  const rate = rateLimit(`post:/api/bookings:${ip}`, 20, 60_000);
  if (!rate.ok) {
    return NextResponse.json({ error: "Too Many Requests" }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch (error) {
    console.error("[bookings] failed to parse request body", error);
    return errorResponse("invalid_payload", 400);
  }

  const parsed = BookingCreateSchema.safeParse(body);
  if (!parsed.success) {
    console.error("[bookings] invalid payload", parsed.error.flatten());
    return errorResponse("invalid_payload", 400, { errors: parsed.error.issues });
  }

  const slotId = parsed.data.slotId;
  const playerName = parsed.data.playerName;
  const bookingType = normalizeBookingType(parsed.data.bookingType);
  const identityVId = parsed.data.identityVId.trim();
  const discordIdRaw = parsed.data.discordId ?? null;
  const notesRaw = parsed.data.notes ?? null;

  const discordId = toNullable(discordIdRaw);
  const notes = toNullable(notesRaw);

  if (bookingType === "COACHING" && !discordId) {
    console.error("[bookings] discord id required for coaching", { slotId });
    return errorResponse("discord_required", 400);
  }

  const slot = await prisma.slot.findUnique({
    where: { id: slotId },
    include: { booking: true },
  });

  if (!slot) {
    console.error("[bookings] slot not found", { slotId });
    return errorResponse("slot_not_found", 404);
  }

  if (slot.status !== "available") {
    console.error("[bookings] slot not available", { slotId, status: slot.status });
    return errorResponse("slot_not_available", 409);
  }

  if (slot.booking) {
    console.error("[bookings] slot already has booking", { slotId });
    return errorResponse("duplicate_booking", 409);
  }

  const paidSlotPriceCandidate = slot.isPaidSlot
    ? Number.parseInt(process.env.PAID_SLOT_PRICE_JPY ?? "", 10)
    : Number.NaN;
  const paidSlotPrice =
    Number.isFinite(paidSlotPriceCandidate) && paidSlotPriceCandidate > 0
      ? paidSlotPriceCandidate
      : undefined;

  try {
    const booking = await prisma.$transaction(async (tx) => {
      const created = await tx.booking.create({
        data: {
          slotId,
          playerName,
          discordId: discordId ?? "",
          identityVId,
          bookingType,
          notes,
          status: slot.isPaidSlot ? "PENDING_PAYMENT" : "CONFIRMED",
          isPaid: slot.isPaidSlot ? false : true,
        },
        select: {
          id: true,
          cancelToken: true,
          status: true,
          bookingType: true,
          playerName: true,
        },
      });

      await tx.slot.update({
        where: { id: slotId },
        data: { status: "booked" },
      });

      return created;
    });

    let webhookResult:
      | undefined
      | {
          ok?: boolean;
          reason?: string;
        };

    try {
      await notifyDiscord([
          "📅 予約が入りました",
          `枠: ${formatTokyoDateTime(slot.startAt)} 〜 ${formatTokyoDateTime(slot.endAt)}`,
          `種別: ${bookingType === "COACHING" ? "コーチング" : "練習"}`,
          `名前: ${playerName}`,
          `第五人格ID: ${identityVId}`,
          `Discord: ${discordId ?? "-"}`,
          `メモ: ${notes ?? "-"}`,
          slot.isPaidSlot ? "区分: 有料枠" : "区分: 無料枠",
      ].join("\n"));
      webhookResult = { ok: true };
    } catch (notifyError) {
      console.error("[bookings] failed to send discord notification", notifyError);
      webhookResult = {
        ok: false,
        reason: notifyError instanceof Error ? notifyError.message : "unknown",
      };
    }

    const requiresPayment = slot.isPaidSlot && booking.status === "PENDING_PAYMENT";

    return NextResponse.json(
      {
        ok: true,
        bookingId: booking.id,
        cancelToken: booking.cancelToken,
        status: booking.status,
        isPaidSlot: slot.isPaidSlot,
        requiresPayment,
        paidSlotPrice,
        webhook: webhookResult,
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      console.error("[bookings] duplicate booking detected", error);
      return errorResponse("duplicate_booking", 409);
    }
    console.error("[bookings] unexpected error", error);
    return errorResponse("server_error", 500);
  }
}
