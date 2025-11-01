import { z } from 'zod';

export const BookingTypeSchema = z.enum(['PRACTICE', 'COACHING']);
export const BookingStatusSchema = z.enum([
  'PENDING_PAYMENT',
  'CONFIRMED',
  'CANCELLED',
  // Legacy lowercase values kept for backward compatibility with existing records.
  'confirmed',
  'canceled',
]);

export type BookingType = z.infer<typeof BookingTypeSchema>;
export type BookingStatus = 'PENDING_PAYMENT' | 'CONFIRMED' | 'CANCELLED';

export function normalizeBookingStatus(status: string): BookingStatus {
  if (status === 'confirmed' || status === 'CONFIRMED') return 'CONFIRMED';
  if (status === 'canceled' || status === 'CANCELLED') return 'CANCELLED';
  if (status === 'PENDING_PAYMENT') return 'PENDING_PAYMENT';
  // Fallback for unexpected values
  return 'CONFIRMED';
}
