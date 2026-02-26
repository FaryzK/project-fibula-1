const { verifySupabaseJwt } = require('../services/auth.service');

async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const [scheme, token] = authHeader.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const payload = await verifySupabaseJwt(token);
    const userMetadata = payload.user_metadata || {};

    req.user = {
      id: payload.sub || null,
      email: payload.email || null,
      role: payload.role || null,
      firstName: userMetadata.first_name || '',
      lastName: userMetadata.last_name || '',
      profileIconUrl: userMetadata.avatar_url || '',
      theme: userMetadata.theme || 'light'
    };

    return next();
  } catch (_error) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
}

module.exports = {
  requireAuth
};
