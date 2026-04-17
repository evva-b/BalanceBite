const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

const attemptsByKey = new Map();

function getKey(email, ip) {
  return `${email}|${ip || 'unknown'}`;
}

function getState(email, ip) {
  const key = getKey(email, ip);
  const now = Date.now();
  const state = attemptsByKey.get(key);

  if (!state || now > state.resetAt) {
    const freshState = { count: 0, resetAt: now + WINDOW_MS };
    attemptsByKey.set(key, freshState);
    return freshState;
  }

  return state;
}

function isBlocked(email, ip) {
  const state = getState(email, ip);
  return state.count >= MAX_ATTEMPTS;
}

function registerFailure(email, ip) {
  const state = getState(email, ip);
  state.count += 1;
  return { attempts: state.count, remaining: Math.max(MAX_ATTEMPTS - state.count, 0) };
}

function clearAttempts(email, ip) {
  attemptsByKey.delete(getKey(email, ip));
}

module.exports = {
  WINDOW_MS,
  MAX_ATTEMPTS,
  isBlocked,
  registerFailure,
  clearAttempts,
};
