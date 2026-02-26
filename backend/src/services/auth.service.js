const jwt = require('jsonwebtoken');

let jwks = null;
let jwksUrl = null;

function getSupabaseUrl() {
  const supabaseUrl = process.env.SUPABASE_URL;
  if (!supabaseUrl) {
    throw new Error('SUPABASE_URL is not configured');
  }

  return supabaseUrl.replace(/\/$/, '');
}

function decodeJwtHeader(token) {
  const [header] = token.split('.');
  if (!header) {
    return null;
  }

  try {
    return JSON.parse(Buffer.from(header, 'base64url').toString('utf8'));
  } catch (_error) {
    return null;
  }
}

async function getRemoteJwks(supabaseUrl) {
  const { createRemoteJWKSet } = await import('jose');
  const url = new URL('/auth/v1/.well-known/jwks.json', supabaseUrl).toString();

  if (!jwks || jwksUrl !== url) {
    jwks = createRemoteJWKSet(new URL(url));
    jwksUrl = url;
  }

  return jwks;
}

async function verifySupabaseJwt(token) {
  const header = decodeJwtHeader(token);

  if (header?.alg === 'HS256') {
    const secret = process.env.SUPABASE_JWT_SECRET;
    if (!secret) {
      throw new Error('SUPABASE_JWT_SECRET is not configured');
    }

    return jwt.verify(token, secret, { algorithms: ['HS256'] });
  }

  const supabaseUrl = getSupabaseUrl();
  const { jwtVerify } = await import('jose');
  const jwksKey = await getRemoteJwks(supabaseUrl);
  const { payload } = await jwtVerify(token, jwksKey, {
    issuer: `${supabaseUrl}/auth/v1`,
    algorithms: ['ES256', 'RS256']
  });

  return payload;
}

module.exports = {
  verifySupabaseJwt
};
