import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { ensureAdmin } from '@/lib/api-helpers';
import { prisma } from '@/lib/prisma';

const DAY_MS = 86_400_000;

const BookingInfo = z
  .object({
    id: z.string(),
    playerName: z.string(),
    discordId: z.string().optional().default(''),
    identityVId: z.string().optional().default(''),
    bookingType: z.string(),
    notes: z.string().nullable(),
    status: z.string(),
    isPaid: z.boolean(),
    createdAt: z.date(),
  })
  .nullable();

const SlotRow = z.object({
  id: z.string(),
  slotId: z.string(),
  startAt: z.date(),
  endAt: z.date(),
  status: z.string(),
  isPaidSlot: z.boolean(),
  booking: BookingInfo,
});

function startOfDay(date: Date) {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

function endOfDay(date: Date) {
  const result = new Date(date);
  result.setHours(23, 59, 59, 999);
  return result;
}

function parseDateParam(value: string | null): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.valueOf()) ? null : parsed;
}

export async function GET(req: NextRequest) {
  const unauthorized = await ensureAdmin(req);
  if (unauthorized) {
    return unauthorized;
  }

  try {
    const { searchParams } = new URL(req.url);
    const now = new Date();

    const defaultFrom = startOfDay(new Date(now.getTime() - 7 * DAY_MS));
    const defaultTo = endOfDay(new Date(now.getTime() + 90 * DAY_MS));

    const fromParam = parseDateParam(searchParams.get('from'));
    const toParam = parseDateParam(searchParams.get('to'));
    const paidOnly = searchParams.get('paidOnly') === 'true';

    let from = fromParam ?? defaultFrom;
    let to = toParam ?? defaultTo;

    if (from > to) {
      from = defaultFrom;
      to = defaultTo;
    }

    const slots = await prisma.slot.findMany({
      where: {
        startAt: {
          gte: from,
          lte: to,
        },
        ...(paidOnly ? { isPaidSlot: true } : {}),
      },
      orderBy: { startAt: 'asc' },
      include: {
        booking: true,
      },
    });

    const payload = slots.map((slot) => ({
      id: slot.id,
      slotId: slot.id,
      startAt: slot.startAt,
      endAt: slot.endAt,
      status: slot.status ?? 'available',
      isPaidSlot: Boolean(slot.isPaidSlot),
      booking: slot.booking
        ? {
            id: slot.booking.id,
            playerName: slot.booking.playerName ?? '',
            discordId: slot.booking.discordId ?? '',
            identityVId: slot.booking.identityVId ?? '',
            bookingType: slot.booking.bookingType ?? '',
            notes: slot.booking.notes ?? null,
            status: slot.booking.status ?? '',
            isPaid: Boolean(slot.booking.isPaid),
            createdAt: slot.booking.createdAt,
          }
        : null,
    }));

    const data = z.array(SlotRow).parse(payload);

    return NextResponse.json({ ok: true, slots: data });
  } catch (error) {
    console.error('[admin/bookings] list failed:', error);
    const message = error instanceof Error ? error.message : 'list_failed';
    const issues = error instanceof z.ZodError ? error.issues : undefined;
    return NextResponse.json(
      { ok: false, error: message, issues },
      { status: 500 },
    );
  }
}
