import "server-only";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { jstRangeToUtc } from "@/lib/date";


const CreateSlotSchema = z.object({
  start: z.string(),
  end: z.string(),
});

function isTenMinuteStep(date: Date) {
  return date.getMinutes() % 10 === 0 && date.getSeconds() === 0 && date.getMilliseconds() === 0;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const startParam = url.searchParams.get("start");
  const endParam = url.searchParams.get("end");

  const { utcStart, utcEnd } = jstRangeToUtc(startParam, endParam);

  const slots = await prisma.slot.findMany({
    where: {
      AND: [
        { startAt: { lt: utcEnd } },
        { endAt: { gt: utcStart } },
      ],
    },
    include: { booking: true },
    orderBy: { startAt: "asc" },
    take: 1000,
  });
  const sanitized = slots.map((slot) => {
    const status = slot.booking ? "booked" : slot.status;
    return {
      id: slot.id,
      startAt: slot.startAt.toISOString(),
      endAt: slot.endAt.toISOString(),
      status,
      isPaidSlot: Boolean(slot.isPaidSlot),
    };
  });

  const events = sanitized.map((slot) => ({
    id: slot.id,
    start: slot.startAt,
    end: slot.endAt,
    status: slot.status,
    isPaidSlot: slot.isPaidSlot,
  }));

  return NextResponse.json(
    { ok: true, events, slots: sanitized },
    { headers: { "Cache-Control": "no-store" } },
  );
}
export async function POST(req: Request) {
  try {
    const { start, end } = CreateSlotSchema.parse(await req.json());
    const startDate = new Date(start);
    const endDate = new Date(end);

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      return NextResponse.json({ message: "invalid datetime" }, { status: 400 });
    }

    if (startDate >= endDate) {
      return NextResponse.json({ message: "end must be after start" }, { status: 400 });
    }

    if (!isTenMinuteStep(startDate) || !isTenMinuteStep(endDate)) {
      return NextResponse.json({ message: "time must align to 10 minute steps" }, { status: 400 });
    }

    const conflict = await prisma.slot.findFirst({
      where: {
        startAt: { lt: endDate },
        endAt: { gt: startDate },
      },
      select: { id: true },
    });

    if (conflict) {
      return NextResponse.json({ message: "slot already exists in this range" }, { status: 409 });
    }

    const created = await prisma.slot.create({
      data: { startAt: startDate, endAt: endDate, status: "available" },
      select: { id: true, startAt: true, endAt: true, status: true },
    });

    return NextResponse.json(
      {
        slot: {
          id: created.id,
          startAt: created.startAt.toISOString(),
          endAt: created.endAt.toISOString(),
          status: created.status,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "invalid payload" }, { status: 400 });
    }
    console.error("POST /api/slots failed:", error);
    return NextResponse.json({ message: "internal error" }, { status: 500 });
  }
}
