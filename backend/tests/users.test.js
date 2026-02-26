const jwt = require('jsonwebtoken');
const request = require('supertest');
const app = require('../src/app');

describe('Users API', () => {
  const jwtSecret = 'test-supabase-secret';

  beforeAll(() => {
    process.env.SUPABASE_JWT_SECRET = jwtSecret;
  });

  function createToken(payload = {}) {
    return jwt.sign(
      {
        sub: 'user_456',
        email: 'profile@example.com',
        role: 'authenticated',
        user_metadata: {
          first_name: 'Ada',
          last_name: 'Lovelace',
          avatar_url: 'https://example.com/avatar.png',
          theme: 'light'
        },
        ...payload
      },
      jwtSecret,
      { algorithm: 'HS256' }
    );
  }

  it('GET /api/users/me returns 401 without auth', async () => {
    const response = await request(app).get('/api/users/me');
    expect(response.statusCode).toBe(401);
    expect(response.body).toEqual({ error: 'Unauthorized' });
  });

  it('GET /api/users/me returns user profile', async () => {
    const response = await request(app)
      .get('/api/users/me')
      .set('Authorization', `Bearer ${createToken()}`);

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({
      profile: {
        id: 'user_456',
        email: 'profile@example.com',
        firstName: 'Ada',
        lastName: 'Lovelace',
        profileIconUrl: 'https://example.com/avatar.png',
        theme: 'light'
      }
    });
  });

  it('PATCH /api/users/me updates profile fields', async () => {
    const token = createToken();

    const response = await request(app)
      .patch('/api/users/me')
      .set('Authorization', `Bearer ${token}`)
      .send({
        firstName: 'Grace',
        lastName: 'Hopper',
        profileIconUrl: 'https://example.com/new-avatar.png',
        theme: 'dark'
      });

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({
      profile: {
        id: 'user_456',
        email: 'profile@example.com',
        firstName: 'Grace',
        lastName: 'Hopper',
        profileIconUrl: 'https://example.com/new-avatar.png',
        theme: 'dark'
      }
    });
  });

  it('PATCH /api/users/me validates theme', async () => {
    const response = await request(app)
      .patch('/api/users/me')
      .set('Authorization', `Bearer ${createToken()}`)
      .send({
        theme: 'blue'
      });

    expect(response.statusCode).toBe(400);
    expect(response.body).toEqual({ error: 'Invalid theme. Use light or dark.' });
  });
});
