const ProfileModel = require('../models/profileModel');

function toProfessionalProfileDto(row) {
  if (!row) {
    return {
      aboutMe: '',
      experiences: [],
      education: [],
      languages: [],
      software: [],
      phone: '',
      address: '',
      linkedin: '',
    };
  }

  return {
    aboutMe: row.about_me ?? '',
    experiences: row.experiences ?? [],
    education: row.education ?? [],
    languages: row.languages ?? [],
    software: row.software ?? [],
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

    const data = {
      aboutMe: typeof body.aboutMe === 'string' ? body.aboutMe : '',
      experiences: Array.isArray(body.experiences) ? body.experiences : [],
      education: Array.isArray(body.education) ? body.education : [],
      languages: Array.isArray(body.languages) ? body.languages : [],
      software: Array.isArray(body.software) ? body.software : [],
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
