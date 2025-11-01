import 'server-only';

// Normalize secrets to compare by removing width, zero-width, line breaks, and trimming
export const normalizeSecret = (s: string) =>
  String(s ?? '')
    .normalize('NFKC')
    .replace(/[-]/g, '')
    .replace(/\r?\n/g, '')
    .trim();
