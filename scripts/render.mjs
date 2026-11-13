import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdir, writeFile } from 'node:fs/promises';
import { createBrowserRenderer } from './browser-renderer.mjs';
import { DURATION, stateAt, FIRST_RELEASE, VOLLEY_SPAN, RECOVERY_END, FOLLOW_RELEASE, FOLLOW_HIT } from '../timeline.js';

await mkdir('output', { recursive: true });
const previewDirectory = '.local/previews';
await mkdir(previewDirectory, { recursive: true });
const renderer = await createBrowserRenderer();

try {
  for (const [name, t] of [
    ['start', 0], ['zoom', FIRST_RELEASE - 1.1], ['shooting', FIRST_RELEASE + VOLLEY_SPAN / 2],
    ['finish', RECOVERY_END + 0.3], ['follow-shot', FOLLOW_RELEASE + 0.2],
    ['follow-hit', FOLLOW_HIT + 0.1], ['end', DURATION],
  ]) {
    await writeFile(`${previewDirectory}/${name}.png`, await renderer.render(t));
  }

  if (!process.argv.includes('--stills')) {
    const fps = 30;
    const ffmpeg = spawn('ffmpeg', [
      '-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-i', '-',
      '-an', '-c:v', 'libx264', '-preset', 'medium', '-crf', '18',
      '-pix_fmt', 'yuv420p', '-movflags', '+faststart', 'output/followers-arrow-shot.mp4',
    ], { stdio: ['pipe', 'inherit', 'inherit'], windowsHide: true });
    const done = once(ffmpeg, 'close');
    ffmpeg.stdin.on('error', (error) => { if (error.code !== 'EPIPE') throw error; });
    const frames = DURATION * fps;
    for (let i = 0; i < frames; i++) {
      const t = i / fps;
      const png = await renderer.render(t);
      if (!ffmpeg.stdin.write(png)) await once(ffmpeg.stdin, 'drain');
      if (i % (fps * 2) === 0) console.log(`${t.toFixed(0)} / ${DURATION}s: ${stateAt(t).count} followers`);
    }
    ffmpeg.stdin.end();
    const [code] = await done;
    if (code !== 0) throw new Error(`ffmpeg exited with ${code}`);
    console.log('Saved output/followers-arrow-shot.mp4');
  }
} finally {
  await renderer.close();
}
