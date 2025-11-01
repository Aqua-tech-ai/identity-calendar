import 'server-only';

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

import { NEXTAUTH_SECRET } from './env';

export async function ensureAdmin(request: NextRequest) {
  const token = await getToken({ req: request, secret: NEXTAUTH_SECRET });
  if (token && (token as { role?: string }).role === 'admin') {
    return null;
  }
  return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
}
