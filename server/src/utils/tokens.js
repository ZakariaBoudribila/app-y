const jwt = require('jsonwebtoken');
const crypto = require('crypto');

function requireEnv(name, fallback) {
  const value = process.env[name] ?? fallback;
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

function getAccessSecret() {
  // Backward-compatible fallback to existing JWT_SECRET.
  return requireEnv('JWT_ACCESS_SECRET', process.env.JWT_SECRET);
}

function getAccessExpiresIn() {
  return process.env.JWT_ACCESS_EXPIRES_IN || '15m';
}

function signAccessToken(userId, role) {
  const accessSecret = getAccessSecret();
  const payload = {
    sub: String(userId),
    id: Number.isFinite(Number(userId)) ? Number(userId) : userId,
    role: role || 'user',
  };

  return jwt.sign(payload, accessSecret, { expiresIn: getAccessExpiresIn() });
}

function verifyAccessToken(token) {
  return jwt.verify(token, getAccessSecret());
}

function generateRefreshToken() {
  return crypto.randomBytes(64).toString('hex');
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function parseDurationToMs(input, fallbackMs) {
  if (!input || typeof input !== 'string') return fallbackMs;
  const match = input.trim().match(/^([0-9]+)\s*([mhd])$/i);
  if (!match) return fallbackMs;

  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();
  const multipliers = { m: 60_000, h: 3_600_000, d: 86_400_000 };
  return amount * (multipliers[unit] || 0) || fallbackMs;
}

function getRefreshTtlMs() {
  return parseDurationToMs(process.env.JWT_REFRESH_EXPIRES_IN || '7d', 7 * 24 * 60 * 60 * 1000);
}

module.exports = {
  signAccessToken,
  verifyAccessToken,
  generateRefreshToken,
  hashToken,
  getRefreshTtlMs,
};
