import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { ensureAdmin } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const unauthorized = await ensureAdmin(req);
  if (unauthorized) {
    return unauthorized;
  }

  try {
    const slotId = params.id;
    const slot = await prisma.slot.findUnique({
      where: { id: slotId },
      select: {
        id: true,
        booking: {
          select: { id: true },
        },
      },
    });

    if (!slot) {
      return NextResponse.json({ ok: true });
    }

    await prisma.$transaction(async (tx) => {
      if (slot.booking) {
        await tx.booking.delete({ where: { id: slot.booking.id } });
      }
      await tx.slot.delete({ where: { id: slotId } });
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("admin delete slot failed", error);
    return NextResponse.json({ ok: false, error: "delete_failed" }, { status: 500 });
  }
}
