const { verifySupabaseJwt } = require('../services/auth.service');

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const [scheme, token] = authHeader.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const payload = verifySupabaseJwt(token);

    req.user = {
      id: payload.sub || null,
      email: payload.email || null,
      role: payload.role || null
    };

    return next();
  } catch (_error) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
}

module.exports = {
  requireAuth
};
