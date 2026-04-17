const express = require('express');
const bcrypt = require('bcrypt');
const pool = require('../db');
const authenticate = require('../middlewares/authenticate');
const { serializeCookie } = require('../utils/cookies');
const { createSession, deleteSession, SESSION_TTL_MS } = require('../services/sessionStore');
const { normalizeEmail, validateCredentials } = require('../utils/authValidation');
const { isBlocked, registerFailure, clearAttempts, WINDOW_MS, MAX_ATTEMPTS } = require('../services/loginAttempts');

const router = express.Router();
const INVALID_CREDENTIALS_MESSAGE = 'Неверные учетные данные';
const COOKIE_MAX_AGE_SECONDS = Math.floor(SESSION_TTL_MS / 1000);
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

function attachSessionCookie(res, sessionId) {
  res.setHeader(
    'Set-Cookie',
    serializeCookie('session_id', sessionId, {
      httpOnly: true,
      sameSite: 'Lax',
      path: '/',
      maxAge: COOKIE_MAX_AGE_SECONDS,
      secure: IS_PRODUCTION,
    }),
  );
}

function clearSessionCookie(res) {
  res.setHeader(
    'Set-Cookie',
    serializeCookie('session_id', '', {
      httpOnly: true,
      sameSite: 'Lax',
      path: '/',
      maxAge: 0,
      secure: IS_PRODUCTION,
    }),
  );
}

// FR-101..FR-104, FR-106, NFR-301, NFR-303
router.post('/register', async (req, res, next) => {
  try {
    const validation = validateCredentials(req.body?.email, req.body?.password);
    if (!validation.ok) {
      return res.status(400).json({ error: validation.error });
    }

    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [validation.email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Аккаунт с таким email уже существует' });
    }

    const passwordHash = await bcrypt.hash(validation.password, 10);
    const result = await pool.query(
      'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email',
      [validation.email, passwordHash],
    );
    const user = result.rows[0];
    const session = createSession(user.id);
    attachSessionCookie(res, session.sessionId);
    return res.status(201).json({ message: 'Регистрация успешна', user });
  } catch (error) {
    return next(error);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const password = String(req.body?.password || '');

    if (!email || !password) {
      return res.status(400).json({ error: 'Email и пароль обязательны' });
    }

    if (isBlocked(email, req.ip)) {
      return res.status(429).json({
        error: `Слишком много неудачных попыток. Повторите через ${Math.floor(WINDOW_MS / 60000)} минут`,
      });
    }

    const result = await pool.query('SELECT id, email, password_hash FROM users WHERE email = $1', [email]);
    const user = result.rows[0];

    if (!user) {
      registerFailure(email, req.ip);
      return res.status(401).json({ error: INVALID_CREDENTIALS_MESSAGE });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      const status = registerFailure(email, req.ip);
      return res.status(401).json({
        error: INVALID_CREDENTIALS_MESSAGE,
        meta: { remainingAttempts: status.remaining, maxAttempts: MAX_ATTEMPTS },
      });
    }

    clearAttempts(email, req.ip);
    const session = createSession(user.id);
    attachSessionCookie(res, session.sessionId);
    return res.json({ user: { id: user.id, email: user.email } });
  } catch (error) {
    return next(error);
  }
});

router.post('/logout', authenticate, (req, res) => {
  deleteSession(req.sessionId);
  clearSessionCookie(res);
  return res.json({ message: 'Выход выполнен успешно' });
});

router.get('/me', authenticate, async (req, res, next) => {
  try {
    const result = await pool.query('SELECT id, email FROM users WHERE id = $1', [req.user.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }
    return res.json({ user: result.rows[0] });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
