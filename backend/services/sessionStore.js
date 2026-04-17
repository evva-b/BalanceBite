const crypto = require('crypto');

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const sessions = new Map();

function createSession(userId) {
  const sessionId = crypto.randomBytes(32).toString('hex');
  const expiresAt = Date.now() + SESSION_TTL_MS;
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
  createSession,
  getSession,
  deleteSession,
};
