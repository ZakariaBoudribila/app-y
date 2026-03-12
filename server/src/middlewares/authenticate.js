const { verifyAccessToken } = require('../utils/tokens');

/**
 * Valide le Bearer access token dans Authorization.
 * Attache la payload décodée sur req.user, et un alias compat sur req.userData.
 */
module.exports = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || typeof authHeader !== 'string' || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Missing or malformed Authorization header.' });
  }

  const token = authHeader.slice('Bearer '.length).trim();
  if (!token) {
    return res.status(401).json({ message: 'Missing or malformed Authorization header.' });
  }

  try {
    const decoded = verifyAccessToken(token);

    // decoded.sub est string (on l’a signé comme tel)
    const userId = decoded.sub ?? decoded.id;

    req.user = decoded;
    req.userData = {
      ...decoded,
      id: typeof userId === 'string' ? Number(userId) || userId : userId,
    };

    next();
  } catch (err) {
    if (err?.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Access token expired.' });
    }
    return res.status(401).json({ message: 'Invalid access token.' });
  }
};
