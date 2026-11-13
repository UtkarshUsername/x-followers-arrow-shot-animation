export const START_COUNT = 97;
export const VOLLEY_END_COUNT = 145;
export const END_COUNT = VOLLEY_END_COUNT + 1;
export const SHOTS = VOLLEY_END_COUNT - START_COUNT;
export const FIRST_RELEASE = 3.55;
export const FLIGHT_TIME = 0.12;
export const VOLLEY_SPAN = 5;
export const LAST_RELEASE = FIRST_RELEASE + VOLLEY_SPAN;
export const LAST_HIT = LAST_RELEASE + FLIGHT_TIME;
export const RECOVERY_END = LAST_HIT + 1.1;
export const ZOOM_OUT_START = RECOVERY_END + 0.75;
export const ZOOM_OUT_DURATION = 1.3;
export const FOLLOW_AIM_START = ZOOM_OUT_START + ZOOM_OUT_DURATION + 1;
export const FOLLOW_RELEASE = FOLLOW_AIM_START + 1;
export const FOLLOW_FLIGHT_TIME = 0.42;
export const FOLLOW_HIT = FOLLOW_RELEASE + FOLLOW_FLIGHT_TIME;
export const FOLLOW_RECOVERY_END = FOLLOW_HIT + 1.1;
export const DURATION = Math.ceil(FOLLOW_RECOVERY_END + 2);

const ACCELERATE = VOLLEY_SPAN * 0.2;
const DECELERATE = VOLLEY_SPAN * 0.25;
const MIN_RATE = 0.18;
const CRUISE_END = VOLLEY_SPAN - DECELERATE;
const rampArea = (u) => u ** 3 - u ** 4 / 2;
const ACCEL_AREA = ACCELERATE * (1 + MIN_RATE) / 2;

// Integrate a smooth speed ramp, a constant-speed middle, and a smooth slowdown.
// Inverting this distance places shots evenly along the curve instead of evenly in time.
function cadenceDistance(t) {
  if (t <= ACCELERATE) {
    return MIN_RATE * t + (1 - MIN_RATE) * ACCELERATE * rampArea(t / ACCELERATE);
  }
  const cruiseArea = ACCEL_AREA + Math.min(t - ACCELERATE, CRUISE_END - ACCELERATE);
  if (t <= CRUISE_END) return cruiseArea;
  const dt = t - CRUISE_END;
  return cruiseArea + dt - (1 - MIN_RATE) * DECELERATE * rampArea(dt / DECELERATE);
}

const totalDistance = cadenceDistance(VOLLEY_SPAN);
const releases = Object.freeze(Array.from({ length: SHOTS }, (_, i) => {
  let lo = 0, hi = VOLLEY_SPAN;
  const target = totalDistance * i / (SHOTS - 1);
  for (let step = 0; step < 48; step++) {
    const mid = (lo + hi) / 2;
    if (cadenceDistance(mid) < target) lo = mid; else hi = mid;
  }
  return FIRST_RELEASE + (lo + hi) / 2;
}));

export const releaseTime = (index) => releases[index];
export const hitTime = (index) => releaseTime(index) + FLIGHT_TIME;

export function shotIndexAt(t) {
  let index = -1;
  while (index + 1 < SHOTS && t + 1e-9 >= releaseTime(index + 1)) index++;
  return index;
}

export function stateAt(time) {
  const t = Math.max(0, Math.min(DURATION, time));
  // Scheduled impacts are the source of truth for both the bow and the count.
  let hits = 0;
  while (hits < SHOTS && t + 1e-9 >= hitTime(hits)) hits++;
  const following = t + 1e-9 >= FOLLOW_HIT;
  const lastImpact = following ? FOLLOW_HIT : hits ? hitTime(hits - 1) : -Infinity;
  return {
    time: t,
    hits,
    count: START_COUNT + hits + (following ? 1 : 0),
    impactAge: t - lastImpact,
    following,
    followImpactAge: t - FOLLOW_HIT,
    done: t >= DURATION,
  };
}
