import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { ensureAdmin } from '@/lib/api-helpers';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  const unauthorized = await ensureAdmin(req);
  if (unauthorized) {
    return unauthorized;
  }

  try {
    const body = await req.json().catch(() => ({}));
    const bookingIdRaw = typeof body.bookingId === 'string' ? body.bookingId : '';
    const bookingId = bookingIdRaw.trim();

    if (!bookingId) {
      return NextResponse.json({ ok: false, message: 'bookingId is required' }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findUnique({
        where: { id: bookingId },
        include: { slot: true },
      });

      if (!booking) {
        throw new Error('対象の予約が見つかりません');
      }

      await tx.booking.update({
        where: { id: booking.id },
        data: {
          isPaid: true,
          status: 'CONFIRMED',
        },
      });

      await tx.slot.update({
        where: { id: booking.slotId },
        data: { status: 'booked' },
      });

      return { booking };
    });

    return NextResponse.json({ ok: true, bookingId: result.booking.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : '支払い確定処理に失敗しました';
    const status = message === '対象の予約が見つかりません' ? 404 : 500;
    return NextResponse.json({ ok: false, message }, { status });
  }
}
