import 'server-only';
import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

type Params = {
  params: {
    id: string;
  };
};

const MESSAGES = {
  invalidId: '削除対象のIDが不正です',
  deleteSuccess: '空き枠を削除しました',
  notFound: '空き枠が見つかりませんでした',
  internalError: '内部エラーが発生しました',
} as const;

export async function DELETE(_request: Request, { params }: Params) {
  const { id } = params;
  if (!id) {
    return NextResponse.json({ message: MESSAGES.invalidId }, { status: 400 });
  }

  try {
    await prisma.slot.delete({ where: { id } });
    return NextResponse.json({ message: MESSAGES.deleteSuccess }, { status: 200 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return NextResponse.json({ message: MESSAGES.notFound }, { status: 404 });
    }
    console.error('[api/slots/:id] delete error', error);
    return NextResponse.json({ message: MESSAGES.internalError }, { status: 500 });
  }
}
