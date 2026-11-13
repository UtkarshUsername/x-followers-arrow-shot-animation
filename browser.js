import { createScene, DURATION } from './scene.js';
import profileUrl from './assets/profile.png';
import followUrl from './assets/follow.png';
import followingUrl from './assets/following.png';

const canvas = document.querySelector('canvas');
const playButton = document.querySelector('#play');
const replayButton = document.querySelector('#replay');
const seek = document.querySelector('#seek');
const timeLabel = document.querySelector('#time');
const status = document.querySelector('#status');
const load = (src) => new Promise((resolve, reject) => {
  const image = new Image(); image.onload = () => resolve(image); image.onerror = reject; image.src = src;
});

try {
  const [profile, follow, following] = await Promise.all([load(profileUrl), load(followUrl), load(followingUrl)]);
  const scene = createScene({ canvas, profile, follow, following, makeCanvas(w, h) {
    const c = document.createElement('canvas'); c.width = w; c.height = h; return c;
  }});
  let time = 0;
  let playing = !matchMedia('(prefers-reduced-motion: reduce)').matches;
  let last = null;
  let raf = null;

  function paint() {
    const state = scene.render(time);
    seek.value = time;
    timeLabel.textContent = `${time.toFixed(1)} / ${DURATION.toFixed(1)}s`;
    status.textContent = `${state.count} followers${state.following ? ' · Following' : ''}`;
    playButton.textContent = playing ? 'Pause' : (state.done ? 'Play again' : 'Play');
  }
  function tick(now) {
    raf = null;
    if (!playing) return;
    if (last !== null) time = Math.min(DURATION, time + (now - last) / 1000);
    last = now;
    if (time >= DURATION) playing = false;
    paint();
    if (playing) raf = requestAnimationFrame(tick);
  }
  function schedule() {
    last = null;
    if (playing && raf === null) raf = requestAnimationFrame(tick);
    paint();
  }
  playButton.onclick = () => {
    if (time >= DURATION) time = 0;
    playing = !playing;
    schedule();
  };
  replayButton.onclick = () => { time = 0; playing = true; schedule(); };
  seek.oninput = () => { time = Number(seek.value); last = null; paint(); };
  document.addEventListener('visibilitychange', () => { last = null; });
  schedule();
} catch (error) {
  status.textContent = 'The animation could not load. Open the downloaded MP4.';
  console.error(error);
}
