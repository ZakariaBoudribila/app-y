const UserProfileModel = require('../models/userProfileModel');

function toUserProfileDto(row) {
  if (!row) {
    return {
      aboutMe: '',
      experiences: [],
      education: [],
      languages: [],
      languagesLevels: [],
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
    languagesLevels: row.languages_levels ?? [],
    software: row.software ?? [],
    phone: row.phone ?? '',
    address: row.address ?? '',
    linkedin: row.linkedin ?? '',
  };
}

exports.getUserProfile = async (req, res) => {
  try {
    const userId = req.userData?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized.' });

    const profile = await UserProfileModel.getByUserId(userId);
    return res.status(200).json({ profile: toUserProfileDto(profile) });
  } catch (err) {
    console.error('[getUserProfile]', err);
    const msg = typeof err?.message === 'string' ? err.message : '';
    if (msg.includes('DATABASE_URL')) {
      return res.status(503).json({ message: msg });
    }
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

exports.upsertUserProfile = async (req, res) => {
  try {
    const userId = req.userData?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized.' });

    const body = req.body || {};
    const data = {
      aboutMe: typeof body.aboutMe === 'string' ? body.aboutMe : '',
      experiences: Array.isArray(body.experiences) ? body.experiences : [],
      education: Array.isArray(body.education) ? body.education : [],
      languages: Array.isArray(body.languages) ? body.languages : [],
      languagesLevels: Array.isArray(body.languagesLevels) ? body.languagesLevels : (Array.isArray(body.languages_levels) ? body.languages_levels : []),
      software: Array.isArray(body.software) ? body.software : [],
      phone: typeof body.phone === 'string' ? body.phone : '',
      address: typeof body.address === 'string' ? body.address : '',
      linkedin: typeof body.linkedin === 'string' ? body.linkedin : '',
    };

    const saved = await UserProfileModel.upsert(userId, data);
    return res.status(200).json({ profile: toUserProfileDto(saved) });
  } catch (err) {
    console.error('[upsertUserProfile]', err);
    const msg = typeof err?.message === 'string' ? err.message : '';
    if (msg.includes('DATABASE_URL')) {
      return res.status(503).json({ message: msg });
    }
    return res.status(500).json({ message: 'Internal server error.' });
  }
};
