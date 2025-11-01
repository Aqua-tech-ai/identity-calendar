import 'server-only';
import { createHash, timingSafeEqual } from 'node:crypto';

const sha256 = (s: string) => createHash('sha256').update(s).digest();

export const safeEqualBySha256 = (a: string, b: string) => {
  const da = sha256(a);
  const db = sha256(b);
  if (da.length !== db.length) return false;
  return timingSafeEqual(da, db);
};
