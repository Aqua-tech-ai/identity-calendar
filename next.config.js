/** @type {import('next').NextConfig} */
const isDev = process.env.NODE_ENV !== 'production';

const securityHeaders = [
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "connect-src 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; '),
  },
];

const nextConfig = {
  reactStrictMode: isDev ? false : true, // TODO: Investigate dev-only regression before re-enabling strict mode in development.
  experimental: {
    typedRoutes: true,
  },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
  productionBrowserSourceMaps: false,
  images: {
    domains: [],
    remotePatterns: [],
  },
};

module.exports = nextConfig;
