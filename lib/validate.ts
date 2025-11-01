import { z } from 'zod';

export const BookingCreateSchema = z.object({
  slotId: z.string().trim().min(1),
  playerName: z.string().trim().min(1).max(80),
  discordId: z.string().trim().max(80).optional().nullable(),
  bookingType: z.enum(['PRACTICE', 'COACHING', '練習', 'コーチング']),
  notes: z.string().trim().max(1000).optional().nullable(),
  identityVId: z.string().trim().min(1).max(120),
  gameId: z.string().trim().min(1).max(50).optional().nullable(),
});

export const SlotsBulkSchema = z.object({
  startDate: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().trim().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().trim().regex(/^\d{2}:\d{2}$/),
  slotMinutes: z.number().int().positive().max(300),
  weekdays: z.array(z.number().int().min(0).max(6)).nonempty(),
  isPaidSlot: z.boolean().optional().default(false),
});
