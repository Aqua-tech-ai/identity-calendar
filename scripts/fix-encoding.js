// scripts/fix-encoding.js
const fs = require('fs');
const path = require('path');
const chardet = require('chardet');
const iconv = require('iconv-lite');

const targets = [
  'app/book/BookingClient.tsx',
];

const INVISIBLE = /[\u200B-\u200D\uFEFF\u200E\u200F\u2060]/g; // zero-width characters
const CTRL = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g; // control characters
const SMART_QUOTES = [/[\u201C\u201D]/g, /[\u2018\u2019]/g]; // smart quotes

function normalizeText(txt) {
  let out = txt.replace(INVISIBLE, '')
    .replace(CTRL, '')
    .replace(SMART_QUOTES[0], '"')
    .replace(SMART_QUOTES[1], "'");
  // Force LF line endings
  out = out.replace(/\r\n?/g, '\n');
  return out;
}

function fixFile(file) {
  const buf = fs.readFileSync(file);
  const enc = chardet.detect(buf) || 'UTF-8';
  let text;
  try {
    if (/utf-?8/i.test(enc)) {
      text = buf.toString('utf8');
    } else {
      // Convert common Shift_JIS or CP932 encodings to UTF-8
      const guess = enc.toLowerCase().includes('shift') || enc.toLowerCase().includes('932')
        ? 'cp932'
        : enc;
      text = iconv.decode(buf, guess);
    }
  } catch (e) {
    // Fallback: attempt binary -> UTF-8 read if decoding fails
    text = buf.toString('binary');
  }

  const cleaned = normalizeText(text);
  fs.writeFileSync(file, cleaned, { encoding: 'utf8' });
  console.log(`[fixed] ${file} (detected: ${enc})`);
}

for (const f of targets) {
  const p = path.resolve(process.cwd(), f);
  if (fs.existsSync(p)) {
    fixFile(p);
  } else {
    console.warn(`[skip] not found: ${p}`);
  }
}
