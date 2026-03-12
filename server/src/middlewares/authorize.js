/**
 * RBAC minimal.
 * Usage: router.get('/admin', authenticate, authorize('admin'), handler)
 */
module.exports = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ message: 'Forbidden: insufficient permissions.' });
  }
  return next();
};
