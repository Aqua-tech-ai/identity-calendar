// scripts/cleanup-encoding.js
// UTF-8 (BOMなし)/LF へ統一し、不可視文字・スマートクオート等を除去
// バイナリ/画像はスキップ

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT = path.resolve(__dirname, '..');

const TEXT_EXT = new Set([
  'ts',
  'tsx',
  'js',
  'jsx',
  'json',
  'jsonc',
  'mjs',
  'cjs',
  'css',
  'scss',
  'sass',
  'md',
  'mdx',
  'html',
  'yml',
  'yaml',
  'env',
  'txt',
]);
const EXCLUDE_DIRS = new Set([
  'node_modules',
  '.next',
  '.turbo',
  '.vercel',
  '.git',
  'dist',
  'build',
  'coverage',
  '.pnpm-store',
  '.yarn',
  '.output',
  '.cache',
]);
const EXCLUDE_GLOBS = /\.(png|jpe?g|gif|webp|svg|ico|mp3|mp4|woff2?|ttf|otf|eot|zip)$/i;

const zeroWidth = /[\u200B\u200C\u200D\uFEFF]/g; // ZWSP,ZWNJ,ZWJ,BOM-in-text
const smartQuotes = /[""]/g; // -> "
const smartSingle = /['']/g; // -> '
const smartHyphen = /[\u2012\u2013\u2014\u2212]/g; // -> -
const oddSpaces = /\u00A0/g; // NBSP -> space
// 全角記号の基本正規化（必要最低限）
const zenkakuQuoteDouble = /[\uFF02]/g; // " -> "
const zenkakuQuoteSingle = /[\uFF07]/g; // ' -> '
const zenkakuHyphen = /[\uFF0D]/g; // - -> -

const stats = { files: 0, changed: 0, bytesRemoved: 0, replacements: 0, list: [] };

function isExcludedDir(p) {
  return EXCLUDE_DIRS.has(path.basename(p));
}
function isTextFile(p) {
  if (EXCLUDE_GLOBS.test(p)) return false;
  const ext = path.extname(p).slice(1).toLowerCase();
  return TEXT_EXT.has(ext) || p.endsWith('.env.local') || p.endsWith('.env.example');
}
function toLF(s) {
  return s.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}
function stripBOM(buf) {
  if (buf.length >= 3 && buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) {
    return buf.slice(3);
  }
  return buf;
}

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fp = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!isExcludedDir(fp)) walk(fp);
      continue;
    }
    if (!isTextFile(fp)) continue;

    stats.files++;
    let buf = fs.readFileSync(fp);
    buf = stripBOM(buf);
    let text = buf.toString('utf8');

    const before = text;
    text = toLF(text)
      .replace(zeroWidth, () => {
        stats.replacements++;
        stats.bytesRemoved += 1;
        return '';
      })
      .replace(smartQuotes, () => {
        stats.replacements++;
        return '"';
      })
      .replace(smartSingle, () => {
        stats.replacements++;
        return "'";
      })
      .replace(smartHyphen, () => {
        stats.replacements++;
        return '-';
      })
      .replace(oddSpaces, () => {
        stats.replacements++;
        return ' ';
      })
      .replace(zenkakuQuoteDouble, () => {
        stats.replacements++;
        return '"';
      })
      .replace(zenkakuQuoteSingle, () => {
        stats.replacements++;
        return "'";
      })
      .replace(zenkakuHyphen, () => {
        stats.replacements++;
        return '-';
      });

    if (text !== before) {
      fs.writeFileSync(fp, text, { encoding: 'utf8' }); // BOMなしで保存
      stats.changed++;
      stats.list.push(fp);
    }
  }
}

walk(ROOT);
console.log(JSON.stringify(stats, null, 2));
if (stats.list.length) {
  console.log('\nChanged files:\n' + stats.list.join('\n'));
}
