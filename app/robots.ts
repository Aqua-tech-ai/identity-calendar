import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const base =
    process.env.NEXTAUTH_URL ??
    process.env.APP_BASE_URL ??
    'https://identity-calendar.vercel.app'

  return {
    rules: { userAgent: '*', allow: '/' },
    sitemap: `${base}/sitemap.xml`,
    host: base,
  }
}
