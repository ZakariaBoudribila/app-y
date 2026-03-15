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
    const sql = `SELECT id, username, email, password_hash, role FROM users WHERE email = ?`;
    return dbGet(sql, [email]);
  },

  async findByUsername(username) {
    const sql = `SELECT id, username, email, password_hash, role FROM users WHERE username = ?`;
    return dbGet(sql, [username]);
  },

  async findById(id) {
    const sql = `SELECT id, username, email, role FROM users WHERE id = ?`;
    return dbGet(sql, [id]);
  },

  async create({ username, email, passwordHash, role }) {
    const sql = `
      INSERT INTO users (username, email, password_hash, role)
      VALUES (?, ?, ?, COALESCE(?, 'user'))
      RETURNING id
    `;
    return dbRun(sql, [username, email, passwordHash, role || 'user']);
  },
};

module.exports = UserModel;
