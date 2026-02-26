const jwt = require('jsonwebtoken');
const request = require('supertest');
const app = require('../src/app');
const { resetWorkflowsStore } = require('../src/services/workflows.service');

function signToken(userId, email) {
  return jwt.sign(
    {
      sub: userId,
      email,
      role: 'authenticated'
    },
    process.env.SUPABASE_JWT_SECRET,
    { algorithm: 'HS256' }
  );
}

describe('Workflows API', () => {
  beforeAll(() => {
    process.env.SUPABASE_JWT_SECRET = 'test-supabase-secret';
  });

  beforeEach(() => {
    resetWorkflowsStore();
  });

  it('returns empty list when no workflows exist', async () => {
    const token = signToken('user_a', 'a@example.com');

    const response = await request(app)
      .get('/api/workflows')
      .set('Authorization', `Bearer ${token}`);

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({ workflows: [] });
  });

  it('creates workflow and returns it in list', async () => {
    const token = signToken('user_a', 'a@example.com');

    const createResponse = await request(app)
      .post('/api/workflows')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'AP Invoice Flow' });

    expect(createResponse.statusCode).toBe(201);
    expect(createResponse.body.workflow).toEqual(
      expect.objectContaining({
        name: 'AP Invoice Flow',
        isPublished: false
      })
    );

    const listResponse = await request(app)
      .get('/api/workflows')
      .set('Authorization', `Bearer ${token}`);

    expect(listResponse.statusCode).toBe(200);
    expect(listResponse.body.workflows).toHaveLength(1);
    expect(listResponse.body.workflows[0].name).toBe('AP Invoice Flow');
  });

  it('renames and publishes workflow', async () => {
    const token = signToken('user_a', 'a@example.com');

    const createResponse = await request(app)
      .post('/api/workflows')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Draft Flow' });

    const workflowId = createResponse.body.workflow.id;

    const patchResponse = await request(app)
      .patch(`/api/workflows/${workflowId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Final Flow',
        isPublished: true
      });

    expect(patchResponse.statusCode).toBe(200);
    expect(patchResponse.body.workflow).toEqual(
      expect.objectContaining({
        id: workflowId,
        name: 'Final Flow',
        isPublished: true
      })
    );
  });

  it('deletes workflow', async () => {
    const token = signToken('user_a', 'a@example.com');

    const createResponse = await request(app)
      .post('/api/workflows')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Delete Me' });

    const workflowId = createResponse.body.workflow.id;

    const deleteResponse = await request(app)
      .delete(`/api/workflows/${workflowId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(deleteResponse.statusCode).toBe(204);

    const listResponse = await request(app)
      .get('/api/workflows')
      .set('Authorization', `Bearer ${token}`);

    expect(listResponse.body.workflows).toHaveLength(0);
  });

  it('prevents access to another user workflow', async () => {
    const tokenUserA = signToken('user_a', 'a@example.com');
    const tokenUserB = signToken('user_b', 'b@example.com');

    const createResponse = await request(app)
      .post('/api/workflows')
      .set('Authorization', `Bearer ${tokenUserA}`)
      .send({ name: 'Private Flow' });

    const workflowId = createResponse.body.workflow.id;

    const patchResponse = await request(app)
      .patch(`/api/workflows/${workflowId}`)
      .set('Authorization', `Bearer ${tokenUserB}`)
      .send({ name: 'Hijacked' });

    expect(patchResponse.statusCode).toBe(404);
    expect(patchResponse.body).toEqual({ error: 'Workflow not found' });
  });
});
