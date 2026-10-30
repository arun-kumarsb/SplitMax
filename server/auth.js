import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const JWT_SECRET = process.env.JWT_SECRET || 'splitmax_dev_secret_neon_2026';
export const COOKIE_NAME = 'splitmax_token';

export function signToken(user) {
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      display_name: user.display_name,
      emoji: user.emoji,
      color: user.color,
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

export function hashPassword(plainPassword) {
  return bcrypt.hash(plainPassword, 10);
}

export function comparePassword(plainPassword, hash) {
  return bcrypt.compare(plainPassword, hash);
}

export function authMiddleware(req, res, next) {
  const token = req.cookies?.[COOKIE_NAME] || req.headers.authorization?.replace(/^Bearer\s+/, '');
  if (!token) {
    return res.status(401).json({ error: 'Authentication required. Please log in.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Session expired or invalid. Please log in again.' });
  }
}

export function setAuthCookie(res, token) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/',
  });
}

export function clearAuthCookie(res) {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  });
}
