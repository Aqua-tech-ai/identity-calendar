import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { blockSlot, unblockSlot } from '@/lib/booking-service';
import { ensureAdmin } from '@/lib/api-helpers';
import { blockSlotSchema } from '@/lib/validation';

export async function PATCH(request: NextRequest) {
  const unauthorized = await ensureAdmin(request);
  if (unauthorized) {
    return unauthorized;
  }

  try {
    const body = await request.json();
    const parsed = blockSlotSchema.parse(body);
    const updated =
      parsed.status === 'blocked'
        ? await blockSlot(parsed.slotId)
        : await unblockSlot(parsed.slotId);

    return NextResponse.json({
      slotId: updated.id,
      status: updated.status,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Failed to update slot status' }, { status: 500 });
  }
}
