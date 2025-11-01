export const ALLOW_HOSTS = ['paypay.ne.jp', 'www.paypay.ne.jp'];

export function isAllowedUrl(url: string) {
  try {
    const parsed = new URL(url);
    return ALLOW_HOSTS.includes(parsed.hostname);
  } catch {
    return false;
  }
}
