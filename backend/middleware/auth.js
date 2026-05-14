const jwt = require('jsonwebtoken');

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.warn(
      'JWT_SECRET is not set; using a development fallback. Set JWT_SECRET in .env for production.'
    );
    return 'nul-ereg-dev-secret-change-me';
  }
  return secret;
}

function signToken(userDoc) {
  return jwt.sign(
    {
      sub: String(userDoc._id),
      email: userDoc.email,
      role: userDoc.role,
      name: userDoc.full_name
    },
    getJwtSecret(),
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authentication required.' });
  }
  const token = header.slice(7).trim();
  if (!token) {
    return res.status(401).json({ message: 'Authentication required.' });
  }
  try {
    const payload = jwt.verify(token, getJwtSecret());
    req.auth = payload;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired session.' });
  }
}

function requireAdmin(req, res, next) {
  if (req.auth.role !== 'admin') {
    return res.status(403).json({ message: 'Registrar access only.' });
  }
  next();
}

function requireStudentOrAlumni(req, res, next) {
  const r = req.auth.role;
  if (r !== 'student' && r !== 'alumni') {
    return res.status(403).json({ message: 'Students and alumni only.' });
  }
  next();
}

module.exports = {
  signToken,
  authMiddleware,
  requireAdmin,
  requireStudentOrAlumni
};
