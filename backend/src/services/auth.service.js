const jwt = require('jsonwebtoken');

function verifySupabaseJwt(token) {
  const secret = process.env.SUPABASE_JWT_SECRET;

  if (!secret) {
    throw new Error('SUPABASE_JWT_SECRET is not configured');
  }

  return jwt.verify(token, secret, { algorithms: ['HS256'] });
}

module.exports = {
  verifySupabaseJwt
};
