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

function normalizeStringArrayFromJson(value) {
  if (!Array.isArray(value)) return [];
  return value.filter((v) => typeof v === 'string').map((v) => v.trim()).filter(Boolean);
}

function normalizePdfSectionsLayout(value) {
  const obj = value && typeof value === 'object' ? value : null;
  const leftRaw = Array.isArray(obj?.left) ? obj.left : [];
  const rightRaw = Array.isArray(obj?.right) ? obj.right : [];

  const seen = new Set();
  const pick = (arr) =>
    arr
      .filter((v) => typeof v === 'string')
      .map((v) => v.trim())
      .filter(Boolean)
      .filter((v) => {
        const key = v.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

  return {
    left: pick(leftRaw),
    right: pick(rightRaw),
  };
}

function normalizeBool(value) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    const s = value.trim().toLowerCase();
    if (s === 'true' || s === '1' || s === 'yes' || s === 'y') return true;
    if (s === 'false' || s === '0' || s === 'no' || s === 'n') return false;
  }
  return false;
}

function normalizePdfBlocksLayout(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const out = {};

  for (const [key, raw] of Object.entries(value)) {
    if (typeof key !== 'string' || !key.trim()) continue;
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) continue;
    const x = Number(raw.x);
    const y = Number(raw.y);
    const w = Number(raw.w);
    const h = Number(raw.h);
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(w) || !Number.isFinite(h)) continue;
    out[key] = {
      x: Math.max(0, Math.round(x)),
      y: Math.max(0, Math.round(y)),
      w: Math.max(40, Math.round(w)),
      h: Math.max(24, Math.round(h)),
    };
  }

  return out;
}

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

const ProfileModel = {
  async getProfile(userId) {
    const sql = `
      SELECT user_id, about_me, experiences, education, languages, software, phone, address, linkedin,
             job_title, headline, skills, interests, links, projects, certifications,
             pdf_sections_order, pdf_sections_layout, pdf_free_layout_enabled, pdf_blocks_layout
      FROM user_profiles
      WHERE user_id = ?
    `;

    const row = await dbGet(sql, [userId]);
    if (row) {
      return {
        ...row,
        languages: normalizeTextArray(row.languages),
        software: normalizeTextArray(row.software),
        skills: normalizeTextArray(row.skills),
        interests: normalizeTextArray(row.interests),
        links: normalizeJsonArray(row.links),
        projects: normalizeJsonArray(row.projects),
        certifications: normalizeJsonArray(row.certifications),
        pdf_sections_order: normalizeStringArrayFromJson(row.pdf_sections_order),
        pdf_sections_layout: normalizePdfSectionsLayout(row.pdf_sections_layout),
        pdf_free_layout_enabled: normalizeBool(row.pdf_free_layout_enabled),
        pdf_blocks_layout: normalizePdfBlocksLayout(row.pdf_blocks_layout),
      };
    }

    // Fallback: ancienne table `profiles` (si des données existent déjà en base)
    const legacySql = `
      SELECT user_id, about_me, experiences, education, languages, software, phone, address, linkedin,
             job_title, headline, skills, interests, links, projects, certifications,
             pdf_sections_order, pdf_sections_layout, pdf_free_layout_enabled, pdf_blocks_layout
      FROM profiles
      WHERE user_id = ?
    `;
    const legacy = await dbGet(legacySql, [userId]);
    if (!legacy) return null;

    const normalizedLegacy = {
      ...legacy,
      languages: normalizeTextArray(legacy.languages),
      software: normalizeTextArray(legacy.software),
      skills: normalizeTextArray(legacy.skills),
      interests: normalizeTextArray(legacy.interests),
      links: normalizeJsonArray(legacy.links),
      projects: normalizeJsonArray(legacy.projects),
      certifications: normalizeJsonArray(legacy.certifications),
      pdf_sections_order: normalizeStringArrayFromJson(legacy.pdf_sections_order),
      pdf_sections_layout: normalizePdfSectionsLayout(legacy.pdf_sections_layout),
      pdf_free_layout_enabled: normalizeBool(legacy.pdf_free_layout_enabled),
      pdf_blocks_layout: normalizePdfBlocksLayout(legacy.pdf_blocks_layout),
    };

    // Copie best-effort vers user_profiles
    try {
      await this.upsertProfile(userId, normalizedLegacy);
      const copied = await dbGet(sql, [userId]);
      if (!copied) return normalizedLegacy;
      return {
        ...copied,
        languages: normalizeTextArray(copied.languages),
        software: normalizeTextArray(copied.software),
        skills: normalizeTextArray(copied.skills),
        interests: normalizeTextArray(copied.interests),
        links: normalizeJsonArray(copied.links),
        projects: normalizeJsonArray(copied.projects),
        certifications: normalizeJsonArray(copied.certifications),
        pdf_sections_order: normalizeStringArrayFromJson(copied.pdf_sections_order),
        pdf_sections_layout: normalizePdfSectionsLayout(copied.pdf_sections_layout),
        pdf_free_layout_enabled: normalizeBool(copied.pdf_free_layout_enabled),
        pdf_blocks_layout: normalizePdfBlocksLayout(copied.pdf_blocks_layout),
      };
    } catch {
      return normalizedLegacy;
    }
  },

  async upsertProfile(userId, data) {
    const aboutMe = typeof data?.about_me === 'string' ? data.about_me : (typeof data?.aboutMe === 'string' ? data.aboutMe : null);
    const experiences = normalizeJsonArray(data?.experiences);
    const education = normalizeJsonArray(data?.education);
    const languages = normalizeTextArray(data?.languages);
    const software = normalizeTextArray(data?.software);
    const phone = typeof data?.phone === 'string' ? data.phone.trim() : null;
    const address = typeof data?.address === 'string' ? data.address.trim() : null;
    const linkedin = typeof data?.linkedin === 'string' ? data.linkedin.trim() : null;

    const jobTitle = normalizeString(data?.job_title || data?.jobTitle) || null;
    const headline = normalizeString(data?.headline) || null;
    const skills = normalizeTextArray(data?.skills);
    const interests = normalizeTextArray(data?.interests);
    const links = normalizeJsonArray(data?.links);
    const projects = normalizeJsonArray(data?.projects);
    const certifications = normalizeJsonArray(data?.certifications);
    const pdfSectionsOrder = normalizeStringArrayFromJson(data?.pdf_sections_order ?? data?.pdfSectionsOrder);
    const pdfSectionsLayout = normalizePdfSectionsLayout(data?.pdf_sections_layout ?? data?.pdfSectionsLayout);
    const pdfFreeLayoutEnabled = normalizeBool(data?.pdf_free_layout_enabled ?? data?.pdfFreeLayoutEnabled);
    const pdfBlocksLayout = normalizePdfBlocksLayout(data?.pdf_blocks_layout ?? data?.pdfBlocksLayout);

    const sql = `
      INSERT INTO user_profiles (
        user_id, about_me, experiences, education, languages, software,
        phone, address, linkedin,
        job_title, headline, skills, interests, links, projects, certifications,
        pdf_sections_order, pdf_sections_layout, pdf_free_layout_enabled, pdf_blocks_layout
      )
      VALUES (
        ?, ?, ?::jsonb, ?::jsonb, ?::text[], ?::text[],
        ?, ?, ?,
        ?, ?, ?::text[], ?::text[], ?::jsonb, ?::jsonb, ?::jsonb,
        ?::jsonb, ?::jsonb, ?, ?::jsonb
      )
      ON CONFLICT (user_id)
      DO UPDATE SET
        about_me = EXCLUDED.about_me,
        experiences = EXCLUDED.experiences,
        education = EXCLUDED.education,
        languages = EXCLUDED.languages,
        software = EXCLUDED.software,
        phone = EXCLUDED.phone,
        address = EXCLUDED.address,
        linkedin = EXCLUDED.linkedin,
        job_title = EXCLUDED.job_title,
        headline = EXCLUDED.headline,
        skills = EXCLUDED.skills,
        interests = EXCLUDED.interests,
        links = EXCLUDED.links,
        projects = EXCLUDED.projects,
        certifications = EXCLUDED.certifications,
        pdf_sections_order = EXCLUDED.pdf_sections_order,
        pdf_sections_layout = EXCLUDED.pdf_sections_layout,
        pdf_free_layout_enabled = EXCLUDED.pdf_free_layout_enabled,
        pdf_blocks_layout = EXCLUDED.pdf_blocks_layout
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
      jobTitle,
      headline,
      skills,
      interests,
      JSON.stringify(links),
      JSON.stringify(projects),
      JSON.stringify(certifications),
      JSON.stringify(pdfSectionsOrder),
      JSON.stringify(pdfSectionsLayout),
      pdfFreeLayoutEnabled,
      JSON.stringify(pdfBlocksLayout),
    ]);

    // Compat: maintient aussi l'ancienne table `profiles` (si elle est consultée ailleurs).
    // Cela évite l'impression "ça n'enregistre pas" quand on regarde `profiles` au lieu de `user_profiles`.
    const legacySql = `
      INSERT INTO profiles (
        user_id, about_me, experiences, education, languages, software,
        phone, address, linkedin,
        job_title, headline, skills, interests, links, projects, certifications,
        pdf_sections_order, pdf_sections_layout, pdf_free_layout_enabled, pdf_blocks_layout
      )
      VALUES (
        ?, ?, ?::jsonb, ?::jsonb, ?::text[], ?::text[],
        ?, ?, ?,
        ?, ?, ?::text[], ?::text[], ?::jsonb, ?::jsonb, ?::jsonb,
        ?::jsonb, ?::jsonb, ?, ?::jsonb
      )
      ON CONFLICT (user_id)
      DO UPDATE SET
        about_me = EXCLUDED.about_me,
        experiences = EXCLUDED.experiences,
        education = EXCLUDED.education,
        languages = EXCLUDED.languages,
        software = EXCLUDED.software,
        phone = EXCLUDED.phone,
        address = EXCLUDED.address,
        linkedin = EXCLUDED.linkedin,
        job_title = EXCLUDED.job_title,
        headline = EXCLUDED.headline,
        skills = EXCLUDED.skills,
        interests = EXCLUDED.interests,
        links = EXCLUDED.links,
        projects = EXCLUDED.projects,
        certifications = EXCLUDED.certifications,
        pdf_sections_order = EXCLUDED.pdf_sections_order,
        pdf_sections_layout = EXCLUDED.pdf_sections_layout,
        pdf_free_layout_enabled = EXCLUDED.pdf_free_layout_enabled,
        pdf_blocks_layout = EXCLUDED.pdf_blocks_layout
    `;

    try {
      await dbRun(legacySql, [
        userId,
        aboutMe,
        JSON.stringify(experiences),
        JSON.stringify(education),
        languages,
        software,
        phone,
        address,
        linkedin,
        jobTitle,
        headline,
        skills,
        interests,
        JSON.stringify(links),
        JSON.stringify(projects),
        JSON.stringify(certifications),
        JSON.stringify(pdfSectionsOrder),
        JSON.stringify(pdfSectionsLayout),
        pdfFreeLayoutEnabled,
        JSON.stringify(pdfBlocksLayout),
      ]);
    } catch {
      // Best-effort only.
    }

    return this.getProfile(userId);
  },
};

module.exports = ProfileModel;
