const ProfileModel = require('../models/profileModel');

function toProfessionalProfileDto(row) {
  if (!row) {
    return {
      aboutMe: '',
      experiences: [],
      education: [],
      languages: [],
      software: [],
    };
  }

  return {
    aboutMe: row.about_me ?? '',
    experiences: row.experiences ?? [],
    education: row.education ?? [],
    languages: row.languages ?? [],
    software: row.software ?? [],
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
    };

    const saved = await ProfileModel.upsertProfile(userId, data);
    return res.status(200).json({ profile: toProfessionalProfileDto(saved) });
  } catch (err) {
    console.error('[saveProfile]', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};
