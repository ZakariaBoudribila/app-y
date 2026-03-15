const db = require('../config/database');

function dbGet(sql, params) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
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

const UserModel = {
  async findByEmail(email) {
    const sql = `SELECT id, username, email, password_hash, role, first_name, last_name FROM users WHERE email = ?`;
    return dbGet(sql, [email]);
  },

  async findByUsername(username) {
    const sql = `SELECT id, username, email, password_hash, role, first_name, last_name FROM users WHERE username = ?`;
    return dbGet(sql, [username]);
  },

  async findById(id) {
    const sql = `SELECT id, username, email, role, first_name, last_name FROM users WHERE id = ?`;
    return dbGet(sql, [id]);
  },

  async findByIdWithPasswordHash(id) {
    const sql = `SELECT id, username, email, password_hash, role, first_name, last_name FROM users WHERE id = ?`;
    return dbGet(sql, [id]);
  },

  async create({ username, email, passwordHash, role, firstName, lastName }) {
    const sql = `
      INSERT INTO users (username, email, password_hash, role, first_name, last_name)
      VALUES (?, ?, ?, COALESCE(?, 'user'), ?, ?)
      RETURNING id
    `;
    return dbRun(sql, [username, email, passwordHash, role || 'user', firstName ?? null, lastName ?? null]);
  },

  async updatePasswordHash(userId, passwordHash) {
    const sql = `UPDATE users SET password_hash = ? WHERE id = ?`;
    await dbRun(sql, [passwordHash, userId]);
  },

  async updateName(userId, { firstName, lastName }) {
    const sql = `UPDATE users SET first_name = ?, last_name = ? WHERE id = ?`;
    await dbRun(sql, [firstName ?? null, lastName ?? null, userId]);
  },
};

module.exports = UserModel;
