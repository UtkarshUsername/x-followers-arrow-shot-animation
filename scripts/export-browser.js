import { createScene } from '../scene.js';
import profileUrl from '../assets/profile.png';
import followUrl from '../assets/follow.png';
import followingUrl from '../assets/following.png';

const load = (src) => new Promise((resolve, reject) => {
  const image = new Image();
  image.onload = () => resolve(image);
  image.onerror = reject;
  image.src = src;
});

async function main() {
  const [profile, follow, following] = await Promise.all([load(profileUrl), load(followUrl), load(followingUrl)]);
  const canvas = document.querySelector('canvas');
  const scene = createScene({ canvas, profile, follow, following, makeCanvas(w, h) {
    const surface = document.createElement('canvas');
    surface.width = w; surface.height = h;
    return surface;
  }});
  window.renderAnimation = (time) => {
    scene.render(time);
    return canvas.toDataURL('image/png').split(',')[1];
  };
  window.renderReady = true;
}
main().catch((error) => { window.renderError = String(error); });
