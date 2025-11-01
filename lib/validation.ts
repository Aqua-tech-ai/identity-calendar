import { z } from "zod";

import { BookingTypeSchema } from "../types/booking";

export const bookingTypeSchema = BookingTypeSchema;

export const createBookingSchema = z.object({
  slotId: z.string().min(1, "枠IDを入力してください").max(120),
  playerName: z.string().min(1, "プレイヤー名を入力してください").max(120),
  identityVId: z
    .string()
    .trim()
    .min(1, "第五人格ID を入力してください")
    .max(120, "第五人格ID は120文字以内で入力してください"),
  discordId: z.string().max(120, "Discord ID は120文字以内で入力してください").optional(),
  bookingType: bookingTypeSchema,
  notes: z.string().max(500, "メモは500文字以内で入力してください").optional(),
});

export const cancelBookingSchema = z.object({
  token: z.string().uuid("不正なトークンです"),
});

export const adminLoginSchema = z.object({
  password: z.string().min(1, "パスワードを入力してください"),
});

export const bulkSlotSchema = z.object({
  weekdayMask: z.array(z.number().int().min(0).max(6)).min(1, "曜日を1つ以上選択してください"),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "開始時刻は HH:MM 形式で指定してください"),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, "終了時刻は HH:MM 形式で指定してください"),
  durationMin: z.number().int().min(10).max(240),
  rangeStart: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "開始日は YYYY-MM-DD 形式で指定してください"),
  rangeEnd: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "終了日は YYYY-MM-DD 形式で指定してください"),
  isPaidSlot: z.boolean().optional(),
});

export const blockSlotSchema = z.object({
  slotId: z.string().min(1),
  status: z.enum(["blocked", "available"]),
});
