import type { NextRequest } from 'next/server';
import { listSlotsWithBooking } from '@/lib/booking-service';
import { bookingsToCsv } from '@/lib/csv';
import { ensureAdmin } from '@/lib/api-helpers';

export async function GET(request: NextRequest) {
  const unauthorized = await ensureAdmin(request);
  if (unauthorized) {
    return unauthorized;
  }

  const slots = await listSlotsWithBooking();
  const rows = slots
    .filter((slot) => slot.booking)
    .map((slot) => ({
      bookingType: slot.booking!.bookingType,
      playerName: slot.booking!.playerName,
      discordId: slot.booking!.discordId,
      identityVId: slot.booking!.identityVId,
      notes: slot.booking!.notes,
      slotStart: slot.startAt,
      slotEnd: slot.endAt,
      status: slot.booking!.status,
      cancelToken: slot.booking!.cancelToken,
    }));

  const csv = bookingsToCsv(rows);

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="narufy-bookings.csv"',
    },
  });
}
