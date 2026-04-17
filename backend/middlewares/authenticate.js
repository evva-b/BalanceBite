const { parseCookies } = require('../utils/cookies');
const { getSession } = require('../services/sessionStore');

function authenticate(req, res, next) {
  const cookies = parseCookies(req.headers.cookie);
  const sessionId = cookies.session_id;
  if (!sessionId) {
    return res.status(401).json({ error: 'Требуется авторизация' });
  }

  const session = getSession(sessionId);
  if (!session) {
    return res.status(401).json({ error: 'Сессия не найдена или истекла' });
  }

  req.user = { id: session.userId };
  req.sessionId = sessionId;
  return next();
}

module.exports = authenticate;
