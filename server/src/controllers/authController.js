const bcrypt = require('bcryptjs');
const { randomUUID } = require('crypto');

const UserModel = require('../models/userModel');
const RefreshTokenModel = require('../models/refreshTokenModel');
const {
  signAccessToken,
  generateRefreshToken,
  hashToken,
  getRefreshTtlMs,
} = require('../utils/tokens');

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function refreshCookieOptions() {
  const maxAge = getRefreshTtlMs();
  const sameSite = (process.env.COOKIE_SAME_SITE || (process.env.NODE_ENV === 'production' ? 'none' : 'lax')).toLowerCase();
  // Chrome bloque SameSite=None sans Secure.
  const secure = process.env.COOKIE_SECURE === 'true' || sameSite === 'none';

  return {
    httpOnly: true,
    secure,
    sameSite,
    path: '/',
    domain: process.env.COOKIE_DOMAIN || undefined,
    maxAge,
  };
}

function refreshCookieClearOptions() {
  const opts = refreshCookieOptions();
  // clearCookie ne doit pas avoir maxAge (elle met l'expiration à une date passée)
  delete opts.maxAge;
  return opts;
}

function normalizeEmail(email) {
  return typeof email === 'string' ? email.trim().toLowerCase() : '';
}

function normalizeUsername(username) {
  return typeof username === 'string' ? username.trim() : '';
}

function normalizeNamePart(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function safeUsernameFallbackFromEmail(email) {
  const at = email.indexOf('@');
  if (at <= 0) return 'user';
  return email.slice(0, at).slice(0, 32) || 'user';
}

async function issueRefreshTokenForUser(userId) {
  const rawRefresh = generateRefreshToken();
  const family = randomUUID();
  const expiresAt = new Date(Date.now() + getRefreshTtlMs());

  await RefreshTokenModel.create({
    tokenHash: hashToken(rawRefresh),
    userId,
    family,
    expiresAt,
  });

  return { rawRefresh, family, expiresAt };
}

async function rotateRefreshToken(rawRefresh) {
  const stored = await RefreshTokenModel.findByTokenHash(hashToken(rawRefresh));

  if (!stored) {
    return { ok: false, status: 401, message: 'Invalid refresh token.' };
  }

  if (stored.revoked) {
    await RefreshTokenModel.deleteFamily(stored.family);
    return { ok: false, status: 401, message: 'Token reuse detected. Please log in again.' };
  }

  const expiresAt = new Date(stored.expires_at);
  if (expiresAt < new Date()) {
    await RefreshTokenModel.deleteByTokenHash(stored.token_hash);
    return { ok: false, status: 401, message: 'Refresh token expired.' };
  }

  await RefreshTokenModel.revokeById(stored.id);

  const newRaw = generateRefreshToken();
  await RefreshTokenModel.create({
    tokenHash: hashToken(newRaw),
    userId: stored.user_id,
    family: stored.family,
    expiresAt: new Date(Date.now() + getRefreshTtlMs()),
  });

  return { ok: true, userId: stored.user_id, newRawRefresh: newRaw };
}

// ─── /api/auth/register ──────────────────────────────────────────────────────
async function register(req, res) {
  try {
    const email = normalizeEmail(req.body?.email);
    const password = req.body?.password;
    const usernameInput = normalizeUsername(req.body?.username);
    const firstName = normalizeNamePart(req.body?.firstName);
    const lastName = normalizeNamePart(req.body?.lastName);

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Invalid email format.' });
    }

    if (typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters.' });
    }

    if (!firstName || !lastName) {
      return res.status(400).json({ message: 'First name and last name are required.' });
    }

    const existing = await UserModel.findByEmail(email);
    if (existing) {
      return res.status(409).json({ message: 'Email already in use.' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const username = usernameInput || safeUsernameFallbackFromEmail(email);

    const existingUsername = await UserModel.findByUsername(username);
    if (existingUsername) {
      return res.status(409).json({ message: 'Username already in use.' });
    }

    const userId = await UserModel.create({ username, email, passwordHash, role: 'user', firstName, lastName });

    return res.status(201).json({ message: 'Account created.', userId });
  } catch (err) {
    const errorId = randomUUID();
    console.error(`[register:${errorId}]`, err);
    if (err && (err.code === '23505' || err.code === 23505)) {
      return res.status(409).json({ message: 'Email or username already in use.' });
    }
    return res.status(500).json({ message: 'Internal server error.', errorId });
  }
}

// ─── /api/auth/login ─────────────────────────────────────────────────────────
async function login(req, res) {
  try {
    const email = normalizeEmail(req.body?.email);
    const password = req.body?.password;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const user = await UserModel.findByEmail(email);
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    const accessToken = signAccessToken(user.id, user.role || 'user');
    const { rawRefresh } = await issueRefreshTokenForUser(user.id);

    res.cookie('refreshToken', rawRefresh, refreshCookieOptions());
    return res.status(200).json({ accessToken });
  } catch (err) {
    const errorId = randomUUID();
    console.error(`[login:${errorId}]`, err);
    return res.status(500).json({ message: 'Internal server error.', errorId });
  }
}

// ─── /api/auth/refresh ───────────────────────────────────────────────────────
async function refresh(req, res) {
  try {
    const rawRefresh = req.cookies?.refreshToken;
    if (!rawRefresh) {
      return res.status(401).json({ message: 'No refresh token.' });
    }

    const rotated = await rotateRefreshToken(rawRefresh);
    if (!rotated.ok) {
      res.clearCookie('refreshToken', refreshCookieClearOptions());
      return res.status(rotated.status).json({ message: rotated.message });
    }

    const user = await UserModel.findById(rotated.userId);
    if (!user) {
      res.clearCookie('refreshToken', refreshCookieClearOptions());
      return res.status(401).json({ message: 'User not found.' });
    }

    const accessToken = signAccessToken(user.id, user.role || 'user');

    res.cookie('refreshToken', rotated.newRawRefresh, refreshCookieOptions());
    return res.status(200).json({ accessToken });
  } catch (err) {
    const errorId = randomUUID();
    console.error(`[refresh:${errorId}]`, err);
    return res.status(500).json({ message: 'Internal server error.', errorId });
  }
}

// ─── /api/auth/logout ────────────────────────────────────────────────────────
async function logout(req, res) {
  try {
    const rawRefresh = req.cookies?.refreshToken;

    if (rawRefresh) {
      await RefreshTokenModel.deleteByTokenHash(hashToken(rawRefresh));
      res.clearCookie('refreshToken', refreshCookieClearOptions());
    }

    return res.status(200).json({ message: 'Logged out.' });
  } catch (err) {
    const errorId = randomUUID();
    console.error(`[logout:${errorId}]`, err);
    return res.status(500).json({ message: 'Internal server error.', errorId });
  }
}

// ─── /api/auth/me ────────────────────────────────────────────────────────────
async function me(req, res) {
  try {
    const userId = req.user?.sub ?? req.userData?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized.' });
    }

    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    return res.status(200).json({ user });
  } catch (err) {
    const errorId = randomUUID();
    console.error(`[me:${errorId}]`, err);
    return res.status(500).json({ message: 'Internal server error.', errorId });
  }
}

// ─── /api/auth/profile (update prénom/nom) ───────────────────────────────────
async function updateProfile(req, res) {
  try {
    const userId = req.user?.sub ?? req.userData?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized.' });
    }

    const firstName = normalizeNamePart(req.body?.firstName);
    const lastName = normalizeNamePart(req.body?.lastName);
    const avatarDataUrlRaw = req.body?.avatarDataUrl;

    if (!firstName || !lastName) {
      return res.status(400).json({ message: 'First name and last name are required.' });
    }

    let avatarDataUrl = null;
    if (avatarDataUrlRaw === null || avatarDataUrlRaw === undefined || avatarDataUrlRaw === '') {
      avatarDataUrl = null;
    } else if (typeof avatarDataUrlRaw === 'string') {
      // Format attendu: data:image/<type>;base64,...
      if (!avatarDataUrlRaw.startsWith('data:image/')) {
        return res.status(400).json({ message: 'Invalid avatar format.' });
      }
      // Limite simple pour éviter des payloads trop gros en DB.
      if (avatarDataUrlRaw.length > 350_000) {
        return res.status(413).json({ message: 'Avatar too large.' });
      }
      avatarDataUrl = avatarDataUrlRaw;
    } else {
      return res.status(400).json({ message: 'Invalid avatar format.' });
    }

    await UserModel.updateProfile(userId, { firstName, lastName, avatarDataUrl });
    const user = await UserModel.findById(userId);

    return res.status(200).json({ user });
  } catch (err) {
    const errorId = randomUUID();
    console.error(`[updateProfile:${errorId}]`, err);
    return res.status(500).json({ message: 'Internal server error.', errorId });
  }
}

// ─── /api/auth/change-password ──────────────────────────────────────────────
async function changePassword(req, res) {
  try {
    const userId = req.user?.sub ?? req.userData?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized.' });
    }

    const currentPassword = req.body?.currentPassword;
    const newPassword = req.body?.newPassword;

    if (typeof currentPassword !== 'string' || typeof newPassword !== 'string') {
      return res.status(400).json({ message: 'currentPassword and newPassword are required.' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters.' });
    }

    if (currentPassword === newPassword) {
      return res.status(400).json({ message: 'New password must be different.' });
    }

    const user = await UserModel.findByIdWithPasswordHash(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const ok = await bcrypt.compare(currentPassword, user.password_hash);
    if (!ok) {
      return res.status(401).json({ message: 'Invalid current password.' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await UserModel.updatePasswordHash(userId, passwordHash);

    // Invalide toutes les sessions (refresh tokens) pour cet utilisateur.
    await RefreshTokenModel.deleteByUserId(userId);
    res.clearCookie('refreshToken', refreshCookieClearOptions());

    return res.status(200).json({ message: 'Password updated.' });
  } catch (err) {
    const errorId = randomUUID();
    console.error(`[changePassword:${errorId}]`, err);
    return res.status(500).json({ message: 'Internal server error.', errorId });
  }
}

// ─── Compat legacy (/api/users/*) ─────────────────────────────────────────────
async function registerLegacy(req, res) {
  // Conserve le format de réponse existant (erreur/message) autant que possible.
  try {
    const username = normalizeUsername(req.body?.username);
    const email = normalizeEmail(req.body?.email);
    const password = req.body?.password;
    const firstName = normalizeNamePart(req.body?.firstName);
    const lastName = normalizeNamePart(req.body?.lastName);

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Champs manquants' });
    }

    if (!firstName || !lastName) {
      return res.status(400).json({ error: 'Nom et prénom obligatoires' });
    }

    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Email invalide' });
    }

    if (typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({ error: 'Mot de passe trop court (min 8)' });
    }

    const existingUsername = await UserModel.findByUsername(username);
    if (existingUsername) {
      return res.status(400).json({ error: "Nom d'utilisateur déjà utilisé" });
    }

    const existing = await UserModel.findByEmail(email);
    if (existing) {
      return res.status(400).json({ error: 'Email déjà utilisé ou erreur base de données' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    await UserModel.create({ username, email, passwordHash, role: 'user', firstName, lastName });

    return res.status(201).json({ message: 'Utilisateur créé avec succès' });
  } catch (err) {
    const errorId = randomUUID();
    console.error(`[registerLegacy:${errorId}]`, err);
    if (err && (err.code === '23505' || err.code === 23505)) {
      return res.status(400).json({ error: 'Email ou nom utilisateur déjà utilisé' });
    }
    return res.status(500).json({ error: 'Erreur serveur', errorId });
  }
}

async function loginLegacy(req, res) {
  try {
    const email = normalizeEmail(req.body?.email);
    const password = req.body?.password;

    if (!email || !password) {
      return res.status(400).json({ error: 'Champs manquants' });
    }

    const user = await UserModel.findByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Identifiants incorrects' });
    }

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      return res.status(401).json({ error: 'Identifiants incorrects' });
    }

    const accessToken = signAccessToken(user.id, user.role || 'user');
    const { rawRefresh } = await issueRefreshTokenForUser(user.id);

    res.cookie('refreshToken', rawRefresh, refreshCookieOptions());

    return res.status(200).json({
      token: accessToken,
      user: { username: user.username },
    });
  } catch (err) {
    const errorId = randomUUID();
    console.error(`[loginLegacy:${errorId}]`, err);
    return res.status(500).json({ error: 'Erreur serveur', errorId });
  }
}

module.exports = {
  register,
  login,
  refresh,
  logout,
  me,
  changePassword,
  updateProfile,
  registerLegacy,
  loginLegacy,
};
