import { build } from 'esbuild';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { DURATION, START_COUNT, VOLLEY_END_COUNT, END_COUNT, SHOTS } from '../timeline.js';

const result = await build({
  entryPoints: ['browser.js'], bundle: true, write: false, format: 'esm',
  target: 'es2022', minify: true, legalComments: 'inline',
  loader: { '.jpg': 'dataurl', '.png': 'dataurl' },
});
const license = await readFile('vendor/pixelfx/LICENSE', 'utf8');
const notice = await readFile('vendor/pixelfx/NOTICE.md', 'utf8');
const html = `<!doctype html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${START_COUNT} to ${END_COUNT} | Arrow Shot</title>
<!-- PixelFX: https://github.com/patch-gg/pixelfx\n${license}\n${notice} -->
<style>
*{box-sizing:border-box}html,body{margin:0}body{color:var(--foreground,#e7e9ea);font-family:var(--font-sans,'Segoe UI',sans-serif)}
main{width:min(100%,760px);margin-inline:auto}canvas{display:block;width:100%;height:auto;aspect-ratio:1;background:#000;border-radius:var(--radius,10px)}
.controls{display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding-top:12px}button{cursor:pointer;font:600 12px var(--font-sans,'Segoe UI',sans-serif);color:var(--foreground,#e7e9ea);background:var(--secondary,#18181b);border:1px solid var(--border,#333);border-radius:7px;padding:8px 12px}button:hover{filter:brightness(1.2)}button:focus-visible,input:focus-visible{outline:2px solid var(--ring,#1d9bf0);outline-offset:3px}
input{min-width:80px;flex:1;accent-color:var(--primary,#1d9bf0)}output{font:11px var(--font-mono,monospace);color:var(--muted-foreground,#8e949a)}.meta{display:flex;justify-content:space-between;gap:10px;padding:10px 0 2px;font-size:11px;color:var(--muted-foreground,#8e949a)}a{color:inherit;text-underline-offset:3px}
@media(max-width:420px){button{padding:8px}output{font-size:10px}.controls{gap:7px}}
</style></head><body><main>
<canvas width="1080" height="1080" role="img" aria-label="Utkarsh's X profile. A PixelFX archer raises the follower count from ${START_COUNT} to ${VOLLEY_END_COUNT} with ${SHOTS} arrows. After zooming out, a final arrow hits Follow, changing it to Following, revealing the notification button, and raising the count to ${END_COUNT}."></canvas>
<div class="controls"><button id="play" type="button">Play</button><button id="replay" type="button">Replay</button><input id="seek" type="range" min="0" max="${DURATION}" step="0.01" value="0" aria-label="Animation position"><output id="time">0.0 / ${DURATION.toFixed(1)}s</output></div>
<div class="meta"><span id="status" aria-live="off">${START_COUNT} followers</span><a href="https://patch-gg.github.io/pixelfx/" target="_blank" rel="noopener noreferrer">Arrow Shot by PixelFX ↗</a></div>
</main><script type="module">${result.outputFiles[0].text.replace(/<\/script/gi, '<\\/script')}</script></body></html>`;
await mkdir('output', { recursive: true });
await writeFile('output/followers-arrow-shot.html', html);
await writeFile('index.html', html);
console.log(`Built self-contained HTML (${Math.round(Buffer.byteLength(html) / 1024)} KB)`);
