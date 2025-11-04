import { NextResponse } from 'next/server'

export const dynamic = 'force-static'

export async function GET() {
  const base =
    process.env.NEXTAUTH_URL ??
    process.env.APP_BASE_URL ??
    'https://identity-calendar.vercel.app'

  const body = `User-agent: *
Allow: /

Sitemap: ${base}/sitemap.xml
Host: ${base}
`

  return new NextResponse(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}
