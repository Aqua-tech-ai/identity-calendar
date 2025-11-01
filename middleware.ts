import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

const PROTECTED_PREFIXES = ['/admin', '/api/admin'];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const matched = PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  if (!matched) {
    return NextResponse.next();
  }

  if (pathname.startsWith('/admin/login')) {
    return NextResponse.next();
  }

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (token) {
    return NextResponse.next();
  }

  const loginUrl = new URL('/admin/login', req.url);
  loginUrl.searchParams.set('callbackUrl', req.nextUrl.pathname + req.nextUrl.search);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};
