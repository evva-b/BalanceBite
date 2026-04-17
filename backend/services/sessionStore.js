const crypto = require('crypto');

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const SHORT_SESSION_TTL_MS = 24 * 60 * 60 * 1000;
const sessions = new Map();

function createSession(userId, options = {}) {
  const ttlMs = Number(options.ttlMs) > 0 ? Number(options.ttlMs) : SESSION_TTL_MS;
  const sessionId = crypto.randomBytes(32).toString('hex');
  const expiresAt = Date.now() + ttlMs;
  sessions.set(sessionId, { userId, expiresAt });
  return { sessionId, expiresAt };
}

function getSession(sessionId) {
  const session = sessions.get(sessionId);
  if (!session) return null;

  if (session.expiresAt <= Date.now()) {
    sessions.delete(sessionId);
    return null;
  }

  return session;
}

function deleteSession(sessionId) {
  sessions.delete(sessionId);
}

module.exports = {
  SESSION_TTL_MS,
  SHORT_SESSION_TTL_MS,
  createSession,
  getSession,
  deleteSession,
};
