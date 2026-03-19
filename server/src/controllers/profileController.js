const ProfileModel = require('../models/profileModel');

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

function normalizeTextArray(value) {
  const arr = Array.isArray(value) ? value : parsePgTextArrayLiteral(value);
  if (!Array.isArray(arr)) return [];
  return arr
    .filter((v) => typeof v === 'string')
    .map((v) => v.trim())
    .filter(Boolean);
}

function toProfessionalProfileDto(row) {
  if (!row) {
    return {
      jobTitle: '',
      headline: '',
      pdfSectionsOrder: [],
      aboutMe: '',
      experiences: [],
      education: [],
      languages: [],
      software: [],
      skills: [],
      projects: [],
      certifications: [],
      interests: [],
      links: [],
      phone: '',
      address: '',
      linkedin: '',
    };
  }

  return {
    jobTitle: row.job_title ?? '',
    headline: row.headline ?? '',
    pdfSectionsOrder: Array.isArray(row.pdf_sections_order) ? row.pdf_sections_order : [],
    aboutMe: row.about_me ?? '',
    experiences: row.experiences ?? [],
    education: row.education ?? [],
    languages: normalizeTextArray(row.languages),
    software: normalizeTextArray(row.software),
    skills: normalizeTextArray(row.skills),
    projects: Array.isArray(row.projects) ? row.projects : [],
    certifications: Array.isArray(row.certifications) ? row.certifications : [],
    interests: normalizeTextArray(row.interests),
    links: Array.isArray(row.links) ? row.links : [],
    phone: row.phone ?? '',
    address: row.address ?? '',
    linkedin: row.linkedin ?? '',
  };
}

exports.getProfile = async (req, res) => {
  try {
    const userId = req.userData?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized.' });

    const profile = await ProfileModel.getProfile(userId);
    return res.status(200).json({ profile: toProfessionalProfileDto(profile) });
  } catch (err) {
    console.error('[getProfile]', err);
    const msg = typeof err?.message === 'string' ? err.message : '';
    if (msg.includes('DATABASE_URL')) {
      return res.status(503).json({ message: msg });
    }
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

exports.saveProfile = async (req, res) => {
  try {
    const userId = req.userData?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized.' });

    const body = req.body || {};

    // Évite d'écraser languages/software avec [] si le client n'envoie pas le champ.
    // (Changement limité à l'Espace Pro via /api/profile.)
    const existing = await ProfileModel.getProfile(userId);

    const data = {
      jobTitle: typeof body.jobTitle === 'string' ? body.jobTitle : (existing?.job_title ?? ''),
      headline: typeof body.headline === 'string' ? body.headline : (existing?.headline ?? ''),
      pdfSectionsOrder: Object.prototype.hasOwnProperty.call(body, 'pdfSectionsOrder')
        ? (Array.isArray(body.pdfSectionsOrder) ? body.pdfSectionsOrder : [])
        : (Array.isArray(existing?.pdf_sections_order) ? existing.pdf_sections_order : []),
      aboutMe: typeof body.aboutMe === 'string' ? body.aboutMe : '',
      experiences: Array.isArray(body.experiences) ? body.experiences : [],
      education: Array.isArray(body.education) ? body.education : [],
      languages: Object.prototype.hasOwnProperty.call(body, 'languages')
        ? (Array.isArray(body.languages) ? body.languages : normalizeTextArray(body.languages))
        : normalizeTextArray(existing?.languages),
      software: Object.prototype.hasOwnProperty.call(body, 'software')
        ? (Array.isArray(body.software) ? body.software : normalizeTextArray(body.software))
        : normalizeTextArray(existing?.software),
      skills: Object.prototype.hasOwnProperty.call(body, 'skills')
        ? (Array.isArray(body.skills) ? body.skills : normalizeTextArray(body.skills))
        : normalizeTextArray(existing?.skills),
      interests: Object.prototype.hasOwnProperty.call(body, 'interests')
        ? (Array.isArray(body.interests) ? body.interests : normalizeTextArray(body.interests))
        : normalizeTextArray(existing?.interests),
      projects: Object.prototype.hasOwnProperty.call(body, 'projects')
        ? (Array.isArray(body.projects) ? body.projects : [])
        : (Array.isArray(existing?.projects) ? existing.projects : []),
      certifications: Object.prototype.hasOwnProperty.call(body, 'certifications')
        ? (Array.isArray(body.certifications) ? body.certifications : [])
        : (Array.isArray(existing?.certifications) ? existing.certifications : []),
      links: Object.prototype.hasOwnProperty.call(body, 'links')
        ? (Array.isArray(body.links) ? body.links : [])
        : (Array.isArray(existing?.links) ? existing.links : []),
      phone: typeof body.phone === 'string' ? body.phone : '',
      address: typeof body.address === 'string' ? body.address : '',
      linkedin: typeof body.linkedin === 'string' ? body.linkedin : '',
    };

    const saved = await ProfileModel.upsertProfile(userId, data);
    return res.status(200).json({ profile: toProfessionalProfileDto(saved) });
  } catch (err) {
    console.error('[saveProfile]', err);
    const msg = typeof err?.message === 'string' ? err.message : '';
    if (msg.includes('DATABASE_URL')) {
      return res.status(503).json({ message: msg });
    }
    return res.status(500).json({ message: 'Internal server error.' });
  }
};
