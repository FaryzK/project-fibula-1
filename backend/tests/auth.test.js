const jwt = require('jsonwebtoken');
const request = require('supertest');
const app = require('../src/app');

describe('GET /api/auth/me', () => {
  beforeAll(() => {
    process.env.SUPABASE_JWT_SECRET = 'test-supabase-secret';
  });

  it('returns 401 when authorization header is missing', async () => {
    const response = await request(app).get('/api/auth/me');

    expect(response.statusCode).toBe(401);
    expect(response.body).toEqual({ error: 'Unauthorized' });
  });

  it('returns authenticated user when token is valid', async () => {
    const token = jwt.sign(
      {
        sub: 'user_123',
        email: 'user@example.com',
        role: 'authenticated'
      },
      process.env.SUPABASE_JWT_SECRET,
      { algorithm: 'HS256' }
    );

    const response = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({
      user: {
        id: 'user_123',
        email: 'user@example.com',
        role: 'authenticated'
      }
    });
  });
});
