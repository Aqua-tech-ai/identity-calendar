import type { Booking, Slot } from "@prisma/client";

import type { BookingType } from "../types/booking";
import { normalizeBookingStatus } from "../types/booking";
import { Env } from "@/lib/env";
import { notifyDiscord } from "@/lib/notify";

type BookingAction = "BOOKED" | "CANCELED";

export async function notifyDiscordBooking(
  action: BookingAction,
  booking: Booking,
  slot: Slot,
) {
  const baseUrl = Env.APP_BASE_URL ?? "http://localhost:3000";
  const paymentPriceEnv = process.env.PAID_SLOT_PRICE_JPY;
  const paymentPrice =
    paymentPriceEnv && !Number.isNaN(Number(paymentPriceEnv))
      ? Number(paymentPriceEnv)
      : undefined;

  const lines = [
    action === "BOOKED" ? "📅 予約が入りました" : "🗑️ 予約がキャンセルされました",
    `種類: ${booking.bookingType}`,
    `ステータス: ${normalizeBookingStatus(booking.status)}`,
    `名前: ${booking.playerName}`,
    `Discord: ${booking.discordId || "-"}`,
    `メモ: ${booking.notes ?? "-"}`,
    `開始: ${slot.startAt.toISOString()}`,
    `終了: ${slot.endAt.toISOString()}`,
    `支払い区分: ${slot.isPaidSlot ? "有料枠" : "無料枠"}`,
  ];

  if (slot.isPaidSlot && paymentPrice !== undefined) {
    lines.push(`金額: ¥${paymentPrice.toLocaleString("ja-JP")}`);
  }

  lines.push(`キャンセルURL: ${baseUrl}/cancel?token=${booking.cancelToken}`);
  lines.push(`管理画面: ${baseUrl}/admin?focus=${booking.id}`);

  return notifyDiscord(lines.join("\n"));
}
