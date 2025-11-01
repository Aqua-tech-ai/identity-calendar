const fs = require('fs');
const path = require('path');
const chardet = require('chardet');
const iconv = require('iconv-lite');

const file = path.resolve(process.cwd(), 'app/book/BookingClient.tsx');

const INVISIBLE = /[\u200B-\u200D\uFEFF\u200E\u200F\u2060]/g; // zero-width/invisible chars
const CTRL = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g; // control characters
const SMART_DQ = /[\u201C\u201D]/g; // smart double quotes
const SMART_SQ = /[\u2018\u2019]/g; // smart single quotes

function decodeToUtf8(buf) {
  const enc = (chardet.detect(buf) || 'UTF-8').toLowerCase();
  if (enc.includes('utf')) return buf.toString('utf8');
  if (enc.includes('shift') || enc.includes('932') || enc.includes('windows-31j')) {
    return iconv.decode(buf, 'cp932');
  }
  try {
    return iconv.decode(buf, enc);
  } catch {
    return buf.toString('utf8');
  }
}

function sanitize(txt) {
  return txt
    .replace(INVISIBLE, '')
    .replace(CTRL, '')
    .replace(SMART_DQ, '"')
    .replace(SMART_SQ, "'")
    .replace(/\r\n?/g, '\n');
}

function patchConstants(txt) {
  txt = txt.replace(
    /const\s+WEEKDAY_LABELS\s*=\s*\[[^\]]*\];?/m,
    'const WEEKDAY_LABELS = ["日","月","火","水","木","金","土"];'
  );

  txt = txt.replace(
    /const\s+STATUS_LABELS\s*=\s*\{[\s\S]*?\};?/m,
    ''
  );
  const injectStatus =
    'const STATUS_LABELS = {\n' +
    '  available: "空き枠",\n' +
    '  booked: "予約済み",\n' +
    '  blocked: "選択不可",\n' +
    '};';

  if (txt.includes('const WEEKDAY_LABELS')) {
    txt = txt.replace(/const WEEKDAY_LABELS[^\n]*\n/, (m) => m + injectStatus + '\n');
  } else {
    txt = injectStatus + '\n' + txt;
  }

  txt = txt.replace(
    /const\s+paypayLink\s*=\s*[^\n;]*;?/m,
    'const paypayLink = process.env.NEXT_PUBLIC_PAYPAY_LINK ?? "";'
  );

  return txt;
}

if (!fs.existsSync(file)) {
  console.error('not found:', file);
  process.exit(1);
}

const buf = fs.readFileSync(file);
let text = decodeToUtf8(buf);
text = sanitize(text);
text = patchConstants(text);
fs.writeFileSync(file, text, { encoding: 'utf8', flag: 'w' });
console.log('[fixed] BookingClient.tsx normalized to UTF-8/LF and constants patched.');
