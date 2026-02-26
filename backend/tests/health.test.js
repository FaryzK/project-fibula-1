const request = require('supertest');
const app = require('../src/app');

describe('GET /api/health', () => {
  it('returns status ok', async () => {
    const response = await request(app).get('/api/health');
    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });

  it('returns readiness status with missing env vars', async () => {
    const previousEnv = {
      SUPABASE_URL: process.env.SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
      SUPABASE_JWT_SECRET: process.env.SUPABASE_JWT_SECRET
    };

    try {
      delete process.env.SUPABASE_URL;
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;
      delete process.env.SUPABASE_JWT_SECRET;

      const response = await request(app).get('/api/health/readiness');

      expect(response.statusCode).toBe(503);
      expect(response.body.status).toBe('degraded');
      expect(response.body.ready).toBe(false);
      expect(response.body.missingEnvVars).toEqual([
        'SUPABASE_URL',
        'SUPABASE_SERVICE_ROLE_KEY',
        'SUPABASE_JWT_SECRET'
      ]);
    } finally {
      process.env.SUPABASE_URL = previousEnv.SUPABASE_URL;
      process.env.SUPABASE_SERVICE_ROLE_KEY = previousEnv.SUPABASE_SERVICE_ROLE_KEY;
      process.env.SUPABASE_JWT_SECRET = previousEnv.SUPABASE_JWT_SECRET;
    }
  });

  it('returns readiness ok when required env vars exist', async () => {
    const previousEnv = {
      SUPABASE_URL: process.env.SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
      SUPABASE_JWT_SECRET: process.env.SUPABASE_JWT_SECRET
    };

    try {
      process.env.SUPABASE_URL = 'https://example.supabase.co';
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'service_role_key';
      process.env.SUPABASE_JWT_SECRET = 'jwt_secret';

      const response = await request(app).get('/api/health/readiness');

      expect(response.statusCode).toBe(200);
      expect(response.body.status).toBe('ok');
      expect(response.body.ready).toBe(true);
      expect(response.body.missingEnvVars).toEqual([]);
    } finally {
      process.env.SUPABASE_URL = previousEnv.SUPABASE_URL;
      process.env.SUPABASE_SERVICE_ROLE_KEY = previousEnv.SUPABASE_SERVICE_ROLE_KEY;
      process.env.SUPABASE_JWT_SECRET = previousEnv.SUPABASE_JWT_SECRET;
    }
  });

  it('returns JSON 404 for unknown api route', async () => {
    const response = await request(app).get('/api/not-found-route');

    expect(response.statusCode).toBe(404);
    expect(response.body).toEqual({ error: 'Not found' });
  });
});
