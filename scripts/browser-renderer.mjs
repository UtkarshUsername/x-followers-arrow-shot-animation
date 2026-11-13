import { chromium } from 'playwright';
import { build } from 'esbuild';

export async function createBrowserRenderer() {
  const bundle = await build({
    entryPoints: ['scripts/export-browser.js'], bundle: true, write: false,
    format: 'iife', target: 'es2022', loader: { '.png': 'dataurl' },
  });
  const browser = await chromium.launch({ headless: true, ...(process.platform === 'win32' ? { channel: 'msedge' } : {}) });
  try {
    const page = await browser.newPage({ viewport: { width: 1080, height: 1080 }, deviceScaleFactor: 1 });
    await page.setContent(`<html><body><canvas width="1080" height="1080"></canvas><script>${bundle.outputFiles[0].text}</script></body></html>`);
    await page.waitForFunction(() => window.renderReady || window.renderError);
    const error = await page.evaluate(() => window.renderError);
    if (error) throw new Error(error);
    return {
      async render(time) {
        return Buffer.from(await page.evaluate((t) => window.renderAnimation(t), time), 'base64');
      },
      close: () => browser.close(),
    };
  } catch (error) {
    await browser.close();
    throw error;
  }
}
