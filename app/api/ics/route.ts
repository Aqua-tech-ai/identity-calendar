import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';
import { generateIcs } from '../../../lib/ics';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slotId = searchParams.get('slotId');
  const startParam = searchParams.get('start');
  const endParam = searchParams.get('end');
  const typeParam = searchParams.get('bookingType') ?? 'PRACTICE';
  const titleParam = searchParams.get('title');

  let startAt: Date | null = null;
  let endAt: Date | null = null;
  let summary = `ナルフィのゲーム広場 - ${typeParam}`;

  if (slotId) {
    const slot = await prisma.slot.findUnique({
      where: { id: slotId },
    });
    if (!slot) {
      return NextResponse.json({ message: 'Slot not found' }, { status: 404 });
    }
    startAt = slot.startAt;
    endAt = slot.endAt;
  } else if (startParam && endParam) {
    startAt = new Date(startParam);
    endAt = new Date(endParam);
  }

  if (!startAt || !endAt) {
    return NextResponse.json({ message: 'Missing time parameters' }, { status: 400 });
  }

  if (titleParam) {
    summary = titleParam;
  }

  const ics = generateIcs({
    startAt,
    endAt,
    summary,
    description: `ナルフィのゲーム広場 - ${typeParam}`,
    url: process.env.APP_BASE_URL ? `${process.env.APP_BASE_URL}/book` : undefined,
  });

  return new Response(ics, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'attachment; filename="narufy-booking.ics"',
    },
  });
}
