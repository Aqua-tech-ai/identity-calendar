import { addDays, addMinutes } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import type { Booking, Prisma, Slot } from '@prisma/client';
import type { infer as Infer } from 'zod';
import { prisma } from './prisma';
import { ConflictError, NotFoundError } from './errors';
import { bulkSlotSchema, createBookingSchema } from './validation';

type CreateBookingInput = Infer<typeof createBookingSchema>;

type BulkSlotInput = Pick<
  Infer<typeof bulkSlotSchema>,
  'weekdayMask' | 'startTime' | 'endTime' | 'durationMin' | 'rangeStart' | 'rangeEnd' | 'isPaidSlot'
>;

const TOKYO_TIMEZONE = 'Asia/Tokyo';

function parseWeekdayMask(mask: number[]): Set<number> {
  return new Set(mask);
}

function* eachTokyoDay(start: string, end: string): Generator<{ date: Date; formatted: string }> {
  const startDate = new Date(`${start}T00:00:00+09:00`);
  const endDate = new Date(`${end}T00:00:00+09:00`);
  for (let current = startDate; current <= endDate; current = addDays(current, 1)) {
    yield {
      date: current,
      formatted: formatInTimeZone(current, TOKYO_TIMEZONE, 'yyyy-MM-dd'),
    };
  }
}

function convertToWeekdayJulian(date: Date): number {
  const weekday = Number.parseInt(formatInTimeZone(date, TOKYO_TIMEZONE, 'e'), 10) - 1;
  return weekday === -1 ? 6 : weekday;
}

function buildUtcFromLocal(date: string, time: string): Date {
  return new Date(`${date}T${time}:00+09:00`);
}

export async function createBooking(input: CreateBookingInput) {
  return prisma.$transaction(async (tx) => {
    const slot = await tx.slot.findUnique({
      where: { id: input.slotId },
      include: { booking: true },
    });

    if (!slot) {
      throw new NotFoundError('Slot not found');
    }

    if (slot.status !== 'available' || slot.booking) {
      throw new ConflictError('Slot already booked');
    }

    const updated = await tx.slot.updateMany({
      where: { id: input.slotId, status: 'available' },
      data: { status: 'booked' },
    });

    if (updated.count === 0) {
      throw new ConflictError('Slot already booked');
    }

    const isPaidSlot = Boolean(slot.isPaidSlot);

    const booking = await tx.booking.create({
      data: {
        slotId: input.slotId,
        bookingType: input.bookingType,
        playerName: input.playerName,
        discordId: input.discordId ?? '',
        identityVId: input.identityVId,
        notes: input.notes ?? null,
        status: isPaidSlot ? 'PENDING_PAYMENT' : 'CONFIRMED',
      },
      include: {
        slot: true,
      },
    });

    return booking;
  });
}

export async function cancelBookingByToken(token: string): Promise<{
  booking: Booking & { slot: Slot };
  changed: boolean;
}> {
  return prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({
      where: { cancelToken: token },
      include: { slot: true },
    });

    if (!booking) {
      throw new NotFoundError('Booking not found');
    }

    if (booking.status === 'canceled' || booking.status === 'CANCELLED') {
      return { booking, changed: false };
    }

    await tx.booking.update({
      where: { id: booking.id },
      data: { status: 'CANCELLED' },
    });

    await tx.slot.update({
      where: { id: booking.slotId },
      data: { status: 'available' },
    });

    return { booking: { ...booking, status: 'CANCELLED' }, changed: true };
  });
}

export async function bulkCreateSlots(input: BulkSlotInput) {
  const mask = parseWeekdayMask(input.weekdayMask);
  const slots: Prisma.SlotCreateManyInput[] = [];
  const paidFlag = Boolean(input.isPaidSlot);

  for (const { date, formatted } of eachTokyoDay(input.rangeStart, input.rangeEnd)) {
    if (!mask.has(convertToWeekdayJulian(date))) {
      continue;
    }

    const dayEnd = buildUtcFromLocal(formatted, input.endTime);
    let currentStart = buildUtcFromLocal(formatted, input.startTime);

    while (currentStart < dayEnd) {
      const currentEnd = addMinutes(currentStart, input.durationMin);
      if (currentEnd > dayEnd) {
        break;
      }
      slots.push({
        startAt: currentStart,
        endAt: currentEnd,
        status: 'available',
        isPaidSlot: paidFlag,
      });
      currentStart = currentEnd;
    }
  }

  if (slots.length === 0) {
    return { count: 0 };
  }

  const result = await prisma.slot.createMany({
    data: slots,
    skipDuplicates: true,
  });

  return { count: result.count };
}

export async function blockSlot(slotId: string) {
  return prisma.slot.update({
    where: { id: slotId },
    data: { status: 'blocked' },
  });
}

export async function unblockSlot(slotId: string) {
  return prisma.slot.update({
    where: { id: slotId },
    data: { status: 'available' },
  });
}

function buildSlotRangeWhere(range?: { start?: Date; end?: Date }): Prisma.SlotWhereInput {
  if (!range?.start && !range?.end) {
    return {};
  }

  return {
    startAt: {
      ...(range.start ? { gte: range.start } : {}),
      ...(range.end ? { lte: range.end } : {}),
    },
  };
}

export async function listSlotsWithBooking(range?: {
  start?: Date;
  end?: Date;
}): Promise<(Slot & { booking: Booking | null })[]> {
  return prisma.slot.findMany({
    where: buildSlotRangeWhere(range),
    include: {
      booking: true,
    },
    orderBy: [{ startAt: 'asc' }],
  });
}

export async function findBookingByCancelToken(token: string) {
  return prisma.booking.findUnique({
    where: { cancelToken: token },
    include: { slot: true },
  });
}

export async function listPublicSlots(range?: { start?: Date; end?: Date }): Promise<
  Array<{
    id: string;
    startAt: Date;
    endAt: Date;
    status: string;
    isPaidSlot: boolean;
  }>
> {
  const slots = await listSlotsWithBooking(range);

  return slots.map((slot) => ({
    id: slot.id,
    startAt: slot.startAt,
    endAt: slot.endAt,
    status: slot.status,
    isPaidSlot: Boolean(slot.isPaidSlot),
  }));
}
