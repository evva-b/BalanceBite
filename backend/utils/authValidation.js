const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function validateCredentials(email, password) {
  const normalizedEmail = normalizeEmail(email);
  const normalizedPassword = String(password || '');

  if (!EMAIL_REGEX.test(normalizedEmail)) {
    return { ok: false, error: 'Некорректный email' };
  }

  if (normalizedPassword.length < MIN_PASSWORD_LENGTH) {
    return { ok: false, error: `Пароль должен быть не короче ${MIN_PASSWORD_LENGTH} символов` };
  }

  return { ok: true, email: normalizedEmail, password: normalizedPassword };
}

module.exports = {
  MIN_PASSWORD_LENGTH,
  normalizeEmail,
  validateCredentials,
};
