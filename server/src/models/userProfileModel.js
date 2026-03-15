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
      else resolve({ lastID: this?.lastID ?? null, changes: this?.changes ?? 0 });
    });
  });
}

function normalizeTextArray(value) {
  if (Array.isArray(value)) return value.filter((v) => typeof v === 'string').map((v) => v.trim()).filter(Boolean);
  return [];
}

function normalizeJsonArray(value) {
  if (Array.isArray(value)) return value;
  return [];
}

const UserProfileModel = {
  async getByUserId(userId) {
    const sql = `
      SELECT user_id, about_me, experiences, education, languages, software, phone, address, linkedin
      FROM user_profiles
      WHERE user_id = ?
    `;
    return dbGet(sql, [userId]);
  },

  async upsert(userId, data) {
    const aboutMe =
      typeof data?.about_me === 'string'
        ? data.about_me
        : (typeof data?.aboutMe === 'string' ? data.aboutMe : null);

    const experiences = normalizeJsonArray(data?.experiences);
    const education = normalizeJsonArray(data?.education);
    const languages = normalizeTextArray(data?.languages);
    const software = normalizeTextArray(data?.software);

    // Champs optionnels (compat)
    const phone = typeof data?.phone === 'string' ? data.phone.trim() : null;
    const address = typeof data?.address === 'string' ? data.address.trim() : null;
    const linkedin = typeof data?.linkedin === 'string' ? data.linkedin.trim() : null;

    const sql = `
      INSERT INTO user_profiles (user_id, about_me, experiences, education, languages, software, phone, address, linkedin)
      VALUES (?, ?, ?::jsonb, ?::jsonb, ?, ?, ?, ?, ?)
      ON CONFLICT (user_id)
      DO UPDATE SET
        about_me = EXCLUDED.about_me,
        experiences = EXCLUDED.experiences,
        education = EXCLUDED.education,
        languages = EXCLUDED.languages,
        software = EXCLUDED.software,
        phone = EXCLUDED.phone,
        address = EXCLUDED.address,
        linkedin = EXCLUDED.linkedin
    `;

    await dbRun(sql, [
      userId,
      aboutMe,
      JSON.stringify(experiences),
      JSON.stringify(education),
      languages,
      software,
      phone,
      address,
      linkedin,
    ]);

    return this.getByUserId(userId);
  },

  async deleteByUserId(userId) {
    const sql = `DELETE FROM user_profiles WHERE user_id = ?`;
    await dbRun(sql, [userId]);
    return true;
  },
};

module.exports = UserProfileModel;
