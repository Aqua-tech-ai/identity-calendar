import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { prisma } from '@/lib/prisma';
import { ensureAdmin } from '@/lib/api-helpers';

type Body = {
  slotIds?: string[];
  force?: boolean;
};

export async function DELETE(req: NextRequest) {
  const unauthorized = await ensureAdmin(req);
  if (unauthorized) {
    return unauthorized;
  }

  try {
    const body = (await req.json().catch(() => ({}))) as Body;
    const slotIds = Array.isArray(body?.slotIds)
      ? body.slotIds.filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
      : [];
    const force = body?.force === true;

    if (slotIds.length === 0) {
      return NextResponse.json({ ok: false, error: 'empty_ids' }, { status: 400 });
    }

    const slots = await prisma.slot.findMany({
      where: { id: { in: slotIds } },
      include: { booking: { select: { id: true } } },
    });

    const existingIds = new Set(slots.map((slot) => slot.id));
    const skipped: Array<{ id: string; reason: 'has_booking' | 'not_found' }> = [];

    for (const id of slotIds) {
      if (!existingIds.has(id)) {
        skipped.push({ id, reason: 'not_found' });
      }
    }

    const deletableIds: string[] = [];
    for (const slot of slots) {
      const hasBooking = Boolean(slot.booking);
      if (force || !hasBooking) {
        deletableIds.push(slot.id);
      } else {
        skipped.push({ id: slot.id, reason: 'has_booking' });
      }
    }

    if (force && deletableIds.length > 0) {
      await prisma.booking.deleteMany({ where: { slotId: { in: deletableIds } } });
    }

    if (deletableIds.length > 0) {
      await prisma.slot.deleteMany({ where: { id: { in: deletableIds } } });
    }

    return NextResponse.json({ ok: true, deletedIds: deletableIds, skipped });
  } catch (error) {
    console.error('[admin/slots] bulk-delete failed:', error);
    return NextResponse.json({ ok: false, error: 'delete_failed' }, { status: 500 });
  }
}
