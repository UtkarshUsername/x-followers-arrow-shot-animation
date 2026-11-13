import { createFrame, clearFrame, composite, createFx, poseAt, posed } from './vendor/pixelfx/src/core/index.js';
import * as arrowShot from './vendor/pixelfx/src/fx/moves/arrow-shot.js';
import * as arrow from './vendor/pixelfx/src/fx/projectiles/arrow.js';
import * as hitSpark from './vendor/pixelfx/src/fx/impacts/hit-spark.js';
import {
  DURATION, FIRST_RELEASE, SHOTS, FLIGHT_TIME, LAST_RELEASE, LAST_HIT, RECOVERY_END,
  ZOOM_OUT_START, ZOOM_OUT_DURATION, FOLLOW_AIM_START, FOLLOW_RELEASE, FOLLOW_FLIGHT_TIME,
  FOLLOW_HIT, FOLLOW_RECOVERY_END, releaseTime, shotIndexAt, stateAt,
} from './timeline.js';

export { DURATION, stateAt };

const WHITE = '#e7e9ea';
const MUTED = '#71767b';
const PROFILE_WIDTH = 897;
const PROFILE_HEIGHT = 829;
const PIXEL_SCALE = 1.5;
const ACTOR = { x: 432, y: 497 };
const COUNT_TARGET = { x: 146, y: ACTOR.y - 28 };
const FOLLOW_TARGET = { x: 813 / PIXEL_SCALE, y: 424 / PIXEL_SCALE };
const FOLLOW_ANGLE = Math.atan2(FOLLOW_TARGET.y - COUNT_TARGET.y, FOLLOW_TARGET.x - ACTOR.x);
const DRAW_CYCLE = 0.3;
const REST = arrowShot.act.poses[0][1];
const AIM = arrowShot.act.poses[1][1];
const DRAWN = arrowShot.act.poses[2][1];
const LOOSED = arrowShot.act.poses[4][1];
const FOLLOW = arrowShot.act.poses[5][1];
const BURST_POSES = [[0, LOOSED], [0.055, FOLLOW], [0.13, AIM], [0.25, DRAWN], [DRAW_CYCLE, DRAWN]];
const clamp = (x) => Math.max(0, Math.min(1, x));
const ease = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
const mix = (a, b, t) => a + (b - a) * t;

function finalAimAngle(t) {
  const raise = ease((t - FOLLOW_AIM_START) / 0.7);
  const lower = ease((t - FOLLOW_HIT - 0.1) / (FOLLOW_RECOVERY_END - FOLLOW_HIT - 0.1));
  return FOLLOW_ANGLE * raise * (1 - lower);
}

function aimUp(pose, angle) {
  const c = Math.cos(angle), s = Math.sin(angle);
  // Rotate the hands around the shoulders, leaving the torso and feet upright.
  return {
    ...pose,
    fx: pose.fx * c - (pose.fy + 28) * s,
    fy: -28 + pose.fx * s + (pose.fy + 28) * c,
    bx: pose.bx * c - (pose.by + 28) * s,
    by: -28 + pose.bx * s + (pose.by + 28) * c,
    sa: (pose.sa ?? 0) + angle,
    hy: -2 * Math.abs(angle / FOLLOW_ANGLE),
  };
}

export function archerPoseAt(t) {
  if (t >= FOLLOW_AIM_START) {
    let pose = REST;
    if (t < FOLLOW_RELEASE) pose = poseAt(arrowShot.act.poses, 0.56 + t - FOLLOW_RELEASE);
    else if (t < FOLLOW_HIT) pose = poseAt(arrowShot.act.poses, 0.562 + (t - FOLLOW_RELEASE) / FOLLOW_FLIGHT_TIME * 0.238);
    else if (t < FOLLOW_RECOVERY_END) pose = poseAt(arrowShot.act.poses, 0.8 + t - FOLLOW_HIT);
    return t >= FOLLOW_RECOVERY_END ? REST : aimUp(pose, finalAimAngle(t));
  }
  if (t < FIRST_RELEASE - 1) return REST;
  if (t < FIRST_RELEASE) return poseAt(arrowShot.act.poses, 0.56 + t - FIRST_RELEASE);
  // Repeat only the middle draw/release section, without lowering the bow.
  if (t < LAST_RELEASE) {
    const shot = shotIndexAt(t);
    const phase = (t - releaseTime(shot)) / (releaseTime(shot + 1) - releaseTime(shot));
    return poseAt(BURST_POSES, clamp(phase) * DRAW_CYCLE);
  }
  if (t < LAST_HIT) return poseAt(arrowShot.act.poses, 0.562 + (t - LAST_RELEASE) / FLIGHT_TIME * 0.238);
  if (t < RECOVERY_END) return poseAt(arrowShot.act.poses, 0.8 + t - LAST_HIT);
  return REST;
}

export function createScene({ canvas, makeCanvas, profile, follow, following, font = 'Arial, sans-serif' }) {
  const ctx = canvas.getContext('2d');
  // The supplied screenshot stays at its original dimensions. Only the count and controls change.
  const effectCanvas = makeCanvas(600, 550);
  const effectCtx = effectCanvas.getContext('2d');
  const frame = createFrame(600, 550);
  const image = effectCtx.createImageData(600, 550);

  function text(value, x, y, size, color = WHITE, weight = 400) {
    ctx.font = `${weight} ${size}px ${font}`;
    ctx.fillStyle = color;
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(value, x, y);
  }

  function floatingText(value, { x, y, age, duration = 0.25, size = 13, color = '#d8bc79', weight = 600 }) {
    if (age < 0 || age >= duration) return;
    const progress = age / duration;
    ctx.save();
    ctx.globalAlpha = Math.sin(Math.PI * progress);
    text(value, x, y - progress * 8.75, size, color, weight);
    ctx.restore();
  }

  function drawSpark(x, y, age, seed, angle = 0, height = 28, flip = false) {
    const fx = createFx(hitSpark, { x, y, height, angle, flip, seed, light: 0.4 });
    fx.update(age);
    fx.draw(frame, 'front');
  }

  function drawEffects(t) {
    clearFrame(frame);
    const body = posed(archerPoseAt(t));
    const mirrored = t < FOLLOW_AIM_START;
    for (let i = 0; i < body.n; i++) {
      const x = ACTOR.x + (mirrored ? -body.xs[i] - 1 : body.xs[i]);
      const y = ACTOR.y + body.ys[i];
      if (x >= 0 && x < frame.w && y >= 0 && y < frame.h) frame.color[y * frame.w + x] = body.color[i];
    }
    for (let i = 0; i < SHOTS; i++) {
      const age = t - releaseTime(i);
      if (age < 0 || age > FLIGHT_TIME + hitSpark.meta.duration) continue;
      if (age < FLIGHT_TIME) {
        const x = mix(ACTOR.x - 30, COUNT_TARGET.x, age / FLIGHT_TIME);
        const fx = createFx(arrow, { x, y: COUNT_TARGET.y, flip: true, seed: 7 + i });
        fx.update(age);
        fx.draw(frame, 'front');
      } else {
        drawSpark(COUNT_TARGET.x, ACTOR.y, age - FLIGHT_TIME, 19 + i, 0, 28, true);
      }
    }

    const finalAge = t - FOLLOW_RELEASE;
    if (finalAge >= 0 && finalAge < FOLLOW_FLIGHT_TIME) {
      const start = {
        x: ACTOR.x + Math.cos(FOLLOW_ANGLE) * 30,
        y: COUNT_TARGET.y + Math.sin(FOLLOW_ANGLE) * 30,
      };
      const u = finalAge / FOLLOW_FLIGHT_TIME;
      const fx = createFx(arrow, {
        x: mix(start.x, FOLLOW_TARGET.x, u), y: mix(start.y, FOLLOW_TARGET.y, u),
        angle: FOLLOW_ANGLE, seed: 89,
      });
      fx.update(finalAge);
      fx.draw(frame, 'front');
    } else if (finalAge >= FOLLOW_FLIGHT_TIME && finalAge < FOLLOW_FLIGHT_TIME + hitSpark.meta.duration) {
      drawSpark(FOLLOW_TARGET.x, FOLLOW_TARGET.y, finalAge - FOLLOW_FLIGHT_TIME, 97, FOLLOW_ANGLE, 0);
    }
    composite(frame, image.data);
    effectCtx.putImageData(image, 0, 0);
  }

  function render(time) {
    const state = stateAt(time);
    const t = state.time;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, 1080, 1080);
    const into = ease((t - 1.1) / 1.25);
    const out = ease((t - ZOOM_OUT_START) / ZOOM_OUT_DURATION);
    const zoom = into * (1 - out);
    const scale = mix(1.08, 2, zoom);
    const centerX = mix(PROFILE_WIDTH / 2, 425, zoom);
    const centerY = mix(PROFILE_HEIGHT / 2, 700, zoom);
    ctx.translate(540 - centerX * scale, 540 - centerY * scale);
    ctx.scale(scale, scale);
    ctx.drawImage(profile, 0, 0, PROFILE_WIDTH, PROFILE_HEIGHT);

    // Remove the original Edit profile control and follower text before adding animated layers.
    ctx.fillStyle = '#000';
    ctx.fillRect(700, 390, 180, 70);
    ctx.fillRect(178, 686, 150, 34);

    drawEffects(t);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(effectCanvas, 0, 0, frame.w * PIXEL_SCALE, frame.h * PIXEL_SCALE);
    ctx.imageSmoothingEnabled = true;

    const pop = state.impactAge < 0.17 ? Math.sin(Math.PI * state.impactAge / 0.17) : 0;
    ctx.save();
    ctx.translate(202, 704);
    ctx.scale(1 + pop * 0.08, 1 + pop * 0.08);
    text(String(state.count), -19, 7, 22, pop > 0.3 ? '#fff3c0' : WHITE, 700);
    ctx.restore();
    text('Followers', 225, 711, 22, MUTED);
    if (!state.following) floatingText('+1', { x: 191, y: 680, age: state.impactAge });
    const growthStart = LAST_HIT + 0.3;
    floatingText(`+${SHOTS} since yesterday`, {
      x: 183, y: 681, age: t - growthStart, duration: FOLLOW_AIM_START - growthStart,
      size: 14, color: '#8aa594', weight: 500,
    });

    const controls = state.following ? following : follow;
    // The 54px controls include bottom padding in the supplied PNGs. Preserve their aspect ratio.
    ctx.drawImage(controls, 873 - controls.width, 397, controls.width, controls.height);
    if (state.following && state.followImpactAge < 0.28) {
      ctx.save();
      ctx.globalAlpha = 1 - state.followImpactAge / 0.28;
      ctx.strokeStyle = '#ffe4a0'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.roundRect(717, 395, 158, 58, 29); ctx.stroke();
      ctx.restore();
    }
    ctx.resetTransform();
    return state;
  }
  return { render };
}
