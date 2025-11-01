const fs = require('fs');
const path = require('path');
const https = require('https');

const packages = [
  {
    name: 'core',
    local: path.join('node_modules', '@fullcalendar', 'core', 'index.css'),
    global: path.join('node_modules', '@fullcalendar', 'core', 'index.global.js'),
    cdn: 'https://cdn.jsdelivr.net/npm/@fullcalendar/core@6.1.15/index.css',
  },
  {
    name: 'daygrid',
    local: path.join('node_modules', '@fullcalendar', 'daygrid', 'index.css'),
    global: path.join('node_modules', '@fullcalendar', 'daygrid', 'index.global.js'),
    cdn: 'https://cdn.jsdelivr.net/npm/@fullcalendar/daygrid@6.1.15/index.css',
  },
  {
    name: 'timegrid',
    local: path.join('node_modules', '@fullcalendar', 'timegrid', 'index.css'),
    global: path.join('node_modules', '@fullcalendar', 'timegrid', 'index.global.js'),
    cdn: 'https://cdn.jsdelivr.net/npm/@fullcalendar/timegrid@6.1.15/index.css',
  },
];

const vendorDir = path.join('styles', 'vendor', 'fullcalendar');

function hasValidCss(filePath) {
  try {
    const stats = fs.statSync(filePath);
    if (!stats.isFile() || stats.size < 16) {
      return false;
    }
    const sample = fs.readFileSync(filePath, 'utf8');
    return sample.includes('.fc') || sample.includes('--fc');
  } catch {
    return false;
  }
}

function ensureDirExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function downloadFile(url, destination) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destination);
    https
      .get(url, (response) => {
        if (response.statusCode && response.statusCode >= 400) {
          response.resume();
          file.close();
          fs.rmSync(destination, { force: true });
          reject(new Error(`Request failed with status ${response.statusCode}`));
          return;
        }
        response.pipe(file);
        file.on('finish', () => file.close(resolve));
      })
      .on('error', (error) => {
        file.close();
        fs.rmSync(destination, { force: true });
        reject(error);
      });
  });
}

async function ensureCss() {
  ensureDirExists(vendorDir);

  const results = await Promise.allSettled(
    packages.map(async ({ name, local, global, cdn }) => {
      if (hasValidCss(local)) {
        return { name, status: 'local' };
      }

      const destination = path.join(vendorDir, `${name}.css`);

      if (hasValidCss(destination)) {
        return { name, status: 'cached' };
      }

      if (fs.existsSync(global)) {
        try {
          const content = fs.readFileSync(global, 'utf8');
          const match = content.match(/var\s+css_[^=]*=\s*"((?:\\.|[^"])*)";/);
          if (match && match[1]) {
            const encoded = match[1].replace(/\\/g, '\\\\').replace(/"/g, '\\"');
            const css = JSON.parse(`"${encoded}"`);
            fs.writeFileSync(destination, css);
            return { name, status: 'extracted' };
          }
        } catch (error) {
          console.warn(`[fc-css-fallback] Failed to extract CSS from ${global}:`, error);
        }
      }

      await downloadFile(cdn, destination);
      return { name, status: 'downloaded', destination };
    }),
  );

  let hadWarning = false;

  for (const result of results) {
    if (result.status === 'fulfilled') {
      const { name, status } = result.value;
      if (status === 'local') {
        console.log(`[fc-css-fallback] Found local CSS for ${name}.`);
      } else if (status === 'cached') {
        console.warn(
          `[fc-css-fallback] Local node_modules CSS missing for ${name}, using cached vendor copy.`,
        );
        hadWarning = true;
      } else if (status === 'extracted') {
        console.warn(
          `[fc-css-fallback] Extracted CSS for ${name} from index.global.js to vendor copy.`,
        );
        hadWarning = true;
      } else if (status === 'downloaded') {
        console.warn(
          `[fc-css-fallback] Downloaded CSS for ${name} from CDN to ensure availability.`,
        );
        hadWarning = true;
      }
    } else {
      console.error(
        `[fc-css-fallback] Failed to ensure CSS for ${result.reason?.name ?? 'unknown'}:`,
        result.reason,
      );
      hadWarning = true;
    }
  }

  if (hadWarning) {
    console.warn(
      '[fc-css-fallback] FullCalendar CSS was missing locally; fallback copies or CDN will be used.',
    );
  } else {
    console.log('[fc-css-fallback] All FullCalendar CSS files present.');
  }
}

ensureCss().catch((error) => {
  console.error('[fc-css-fallback] Unexpected error:', error);
  // Never fail install; allow process to continue
});
