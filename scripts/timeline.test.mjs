import test from 'node:test';
import assert from 'node:assert/strict';
import { DURATION, START_COUNT, VOLLEY_END_COUNT, END_COUNT, SHOTS, FIRST_RELEASE, LAST_RELEASE, LAST_HIT, RECOVERY_END, VOLLEY_SPAN, ZOOM_OUT_START, ZOOM_OUT_DURATION, FOLLOW_AIM_START, FOLLOW_RELEASE, FOLLOW_HIT, FOLLOW_RECOVERY_END, releaseTime, hitTime, stateAt } from '../timeline.js';
import { archerPoseAt } from '../scene.js';
import { act } from '../vendor/pixelfx/src/fx/moves/arrow-shot.js';
import { createBrowserRenderer } from './browser-renderer.mjs';

test('each of the 48 arrivals adds exactly one follower, ending at 145', () => {
  assert.equal(SHOTS, 48);
  assert.equal(VOLLEY_END_COUNT, 145);
  for (let i = 0; i < SHOTS; i++) {
    assert.equal(stateAt(hitTime(i) - 0.0001).count, START_COUNT + i);
    assert.equal(stateAt(hitTime(i)).count, START_COUNT + i + 1);
  }
  assert.equal(stateAt(DURATION).count, END_COUNT);
  assert.equal(stateAt(DURATION + 100).count, END_COUNT);
});

test('cadence speeds up smoothly, holds its pace, and slows down near the end', () => {
  const gaps = Array.from({ length: SHOTS - 1 }, (_, i) => releaseTime(i + 1) - releaseTime(i));
  assert.ok(Math.abs(LAST_RELEASE - FIRST_RELEASE - VOLLEY_SPAN) < 1e-9);
  assert.equal(VOLLEY_SPAN, 5);
  assert.ok(gaps[0] > 0.25);
  assert.ok(gaps.at(-1) > 0.25);
  assert.ok(gaps[20] < 0.1);
  for (let i = 1; i < 8; i++) assert.ok(gaps[i] < gaps[i - 1]);
  for (let i = gaps.length - 7; i < gaps.length; i++) assert.ok(gaps[i] > gaps[i - 1]);
  for (let i = 15; i < 28; i++) assert.ok(Math.abs(gaps[i] - gaps[20]) < 1e-9);
});

test('only the shooting section repeats, then the character recovers once and stays at rest', () => {
  const rest = act.poses[0][1];
  assert.deepEqual(archerPoseAt(0), rest);
  for (let i = 0; i < SHOTS - 1; i++) {
    assert.equal(archerPoseAt(releaseTime(i)).nocked, false);
    const pose = archerPoseAt(releaseTime(i) + 0.01);
    assert.equal(pose.nocked, false);
    assert.notDeepEqual(pose, rest);
  }
  assert.equal(archerPoseAt(LAST_RELEASE + 0.1).nocked, false);
  assert.equal(stateAt(LAST_HIT).count, VOLLEY_END_COUNT);
  assert.deepEqual(archerPoseAt(RECOVERY_END), rest);
  assert.deepEqual(archerPoseAt(DURATION), rest);
});

test('export frames are identical after replay and seeking', async () => {
  const renderer = await createBrowserRenderer();
  try {
    const finish = RECOVERY_END + 0.3;
    const expected = await renderer.render(finish);
    await renderer.render(0);
    await renderer.render(FIRST_RELEASE + VOLLEY_SPAN / 2);
    assert.deepEqual(await renderer.render(finish), expected);
    assert.deepEqual(await renderer.render(finish), expected);
    const ending = await renderer.render(DURATION);
    await renderer.render(FOLLOW_RELEASE + 0.1);
    assert.deepEqual(await renderer.render(DURATION), ending);
  } finally {
    await renderer.close();
  }
});

test('the final arrow changes Follow only on impact, after the camera has zoomed out', () => {
  const zoomOutEnd = ZOOM_OUT_START + ZOOM_OUT_DURATION;
  assert.ok(Math.abs(FOLLOW_AIM_START - zoomOutEnd - 1) < 1e-9);
  assert.deepEqual(archerPoseAt(zoomOutEnd + 0.5), act.poses[0][1]);
  assert.equal(stateAt(FOLLOW_RELEASE).following, false);
  assert.equal(stateAt(FOLLOW_RELEASE).count, 145);
  assert.equal(stateAt(FOLLOW_HIT - 0.0001).following, false);
  assert.equal(stateAt(FOLLOW_HIT - 0.0001).count, 145);
  assert.equal(stateAt(FOLLOW_HIT).following, true);
  assert.equal(stateAt(FOLLOW_HIT).count, 146);
  assert.equal(stateAt(FOLLOW_HIT).impactAge, 0);
  assert.equal(stateAt(DURATION).following, true);
  assert.equal(stateAt(FOLLOW_HIT).count, END_COUNT);
  assert.equal(stateAt(DURATION).count, END_COUNT);
  assert.equal(END_COUNT, 146);
  const pose = archerPoseAt(FOLLOW_RELEASE + 0.01);
  assert.equal(pose.nocked, false);
  assert.ok(pose.sa < -0.8);
  assert.ok(pose.fy < -35);
  assert.deepEqual(archerPoseAt(FOLLOW_RECOVERY_END), act.poses[0][1]);
});
