const db = require('../config/database');

function parsePgTextArrayLiteral(value) {
  if (Array.isArray(value)) return value;
  if (typeof value !== 'string') return [];

  const s = value.trim();
  if (s === '{}' || s === '{NULL}') return [];
  if (!s.startsWith('{') || !s.endsWith('}')) return [];

  const input = s.slice(1, -1);
  const out = [];
  let i = 0;

  while (i < input.length) {
    if (input[i] === ',') {
      i += 1;
      continue;
    }

    let item = '';
    let isQuoted = false;

    if (input[i] === '"') {
      isQuoted = true;
      i += 1;
      while (i < input.length) {
        const ch = input[i];
        if (ch === '\\') {
          const next = input[i + 1];
          if (typeof next === 'string') {
            item += next;
            i += 2;
            continue;
          }
        }
        if (ch === '"') {
          i += 1;
          break;
        }
        item += ch;
        i += 1;
      }
      while (i < input.length && input[i] !== ',') i += 1;
    } else {
      while (i < input.length && input[i] !== ',') {
        item += input[i];
        i += 1;
      }
    }

    const normalized = isQuoted ? item : item.trim();
    if (normalized && normalized.toUpperCase() !== 'NULL') out.push(normalized);
  }

  return out;
}

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
  const arr = Array.isArray(value) ? value : parsePgTextArrayLiteral(value);
  if (Array.isArray(arr)) return arr.filter((v) => typeof v === 'string').map((v) => v.trim()).filter(Boolean);
  return [];
}

function normalizeJsonArray(value) {
  if (Array.isArray(value)) return value;
  return [];
}

function clampPercent(value) {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function normalizeLanguageLevels(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      const name = typeof item?.name === 'string' ? item.name.trim() : '';
      if (!name) return null;
      return { name, percent: clampPercent(item?.percent) };
    })
    .filter(Boolean);
}

const UserProfileModel = {
  async getByUserId(userId) {
    const sql = `
      SELECT user_id, about_me, experiences, education, languages, languages_levels, software, phone, address, linkedin
      FROM user_profiles
      WHERE user_id = ?
    `;
    const row = await dbGet(sql, [userId]);
    if (!row) return row;
    return {
      ...row,
      languages: normalizeTextArray(row.languages),
      software: normalizeTextArray(row.software),
    };
  },

  async upsert(userId, data) {
    const aboutMe =
      typeof data?.about_me === 'string'
        ? data.about_me
        : (typeof data?.aboutMe === 'string' ? data.aboutMe : null);

    const experiences = normalizeJsonArray(data?.experiences);
    const education = normalizeJsonArray(data?.education);
    const languagesLevels = normalizeLanguageLevels(data?.languages_levels ?? data?.languagesLevels);

    // `languages` reste un TEXT[] (compat), dérivé si `languagesLevels` est fourni.
    const languages = languagesLevels.length
      ? [...new Set(languagesLevels.map((l) => l.name))]
      : normalizeTextArray(data?.languages);

    const software = normalizeTextArray(data?.software);

    // Champs optionnels (compat)
    const phone = typeof data?.phone === 'string' ? data.phone.trim() : null;
    const address = typeof data?.address === 'string' ? data.address.trim() : null;
    const linkedin = typeof data?.linkedin === 'string' ? data.linkedin.trim() : null;

    const sql = `
      INSERT INTO user_profiles (user_id, about_me, experiences, education, languages, languages_levels, software, phone, address, linkedin)
      VALUES (?, ?, ?::jsonb, ?::jsonb, ?::text[], ?::jsonb, ?::text[], ?, ?, ?)
      ON CONFLICT (user_id)
      DO UPDATE SET
        about_me = EXCLUDED.about_me,
        experiences = EXCLUDED.experiences,
        education = EXCLUDED.education,
        languages = EXCLUDED.languages,
        languages_levels = EXCLUDED.languages_levels,
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
      JSON.stringify(languagesLevels),
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
