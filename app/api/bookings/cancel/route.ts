import { NextResponse } from 'next/server';
import { cancelBookingSchema } from '../../../../lib/validation';
import { cancelBookingByToken } from '../../../../lib/booking-service';
import { notifyDiscordBooking } from '../../../../lib/notifications';
import { AppError } from '../../../../lib/errors';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = cancelBookingSchema.parse(body);
    const { booking, changed } = await cancelBookingByToken(parsed.token);
    if (changed) {
      await notifyDiscordBooking('CANCELED', booking, booking.slot);
    }

    return NextResponse.json({
      status: changed ? 'ok' : 'already_canceled',
      bookingId: booking.id,
      slotId: booking.slot.id,
    });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }

    console.error(error);
    return NextResponse.json({ message: '繧ｭ繝｣繝ｳ繧ｻ繝ｫ縺ｫ螟ｱ謨励＠縺ｾ縺励◆' }, { status: 500 });
  }
}
