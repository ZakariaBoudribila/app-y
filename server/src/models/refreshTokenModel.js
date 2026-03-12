const db = require('../config/database');

function dbGet(sql, params) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function dbAll(sql, params) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

function dbRun(sql, params) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this?.lastID ?? null);
    });
  });
}

const RefreshTokenModel = {
  async create({ tokenHash, userId, family, expiresAt }) {
    const sql = `
      INSERT INTO refresh_tokens (token_hash, user_id, family, expires_at, revoked, created_at)
      VALUES (?, ?, ?, ?, false, NOW())
      RETURNING id
    `;
    return dbRun(sql, [tokenHash, userId, family, expiresAt]);
  },

  async findByTokenHash(tokenHash) {
    const sql = `
      SELECT id, token_hash, user_id, family, expires_at, revoked
      FROM refresh_tokens
      WHERE token_hash = ?
    `;
    return dbGet(sql, [tokenHash]);
  },

  async revokeById(id) {
    const sql = `UPDATE refresh_tokens SET revoked = true, revoked_at = NOW() WHERE id = ?`;
    await dbRun(sql, [id]);
  },

  async deleteByTokenHash(tokenHash) {
    const sql = `DELETE FROM refresh_tokens WHERE token_hash = ?`;
    await dbRun(sql, [tokenHash]);
  },

  async deleteFamily(family) {
    const sql = `DELETE FROM refresh_tokens WHERE family = ?`;
    await dbRun(sql, [family]);
  },

  async listByFamily(family) {
    const sql = `SELECT id, revoked FROM refresh_tokens WHERE family = ?`;
    return dbAll(sql, [family]);
  },
};

module.exports = RefreshTokenModel;
