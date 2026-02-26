const jwt = require('jsonwebtoken');
const request = require('supertest');
const app = require('../src/app');
const {
  resetConfigServiceStores
} = require('../src/services/config-service-nodes.service');

function authToken(userId) {
  return jwt.sign(
    {
      sub: userId,
      email: `${userId}@example.com`,
      role: 'authenticated'
    },
    process.env.SUPABASE_JWT_SECRET,
    { algorithm: 'HS256' }
  );
}

describe('Config and service nodes APIs', () => {
  beforeAll(() => {
    process.env.SUPABASE_JWT_SECRET = 'test-supabase-secret';
  });

  beforeEach(() => {
    resetConfigServiceStores();
  });

  it('creates and lists splitting prompts with preview text', async () => {
    const token = authToken('user_a');

    const createResponse = await request(app)
      .post('/api/splitting-prompts')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Split Invoice Pack',
        instructions: 'Split document into invoice, PO, and delivery note pages.'
      });

    expect(createResponse.statusCode).toBe(201);
    expect(createResponse.body.prompt).toEqual(
      expect.objectContaining({
        name: 'Split Invoice Pack',
        instructionsPreview: expect.any(String)
      })
    );

    const listResponse = await request(app)
      .get('/api/splitting-prompts')
      .set('Authorization', `Bearer ${token}`);

    expect(listResponse.statusCode).toBe(200);
    expect(listResponse.body.prompts).toHaveLength(1);
  });

  it('rejects deleting splitting prompt when in use', async () => {
    const token = authToken('user_a');

    const createResponse = await request(app)
      .post('/api/splitting-prompts')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Split Invoice Pack',
        instructions: 'Split document into invoice pages.'
      });

    const promptId = createResponse.body.prompt.id;

    await request(app)
      .patch(`/api/splitting-prompts/${promptId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        nodeUsages: [{ workflowId: 'wf_1', workflowName: 'AP', nodeId: 'node_1', nodeName: 'Split' }]
      });

    const deleteResponse = await request(app)
      .delete(`/api/splitting-prompts/${promptId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(deleteResponse.statusCode).toBe(409);
    expect(deleteResponse.body).toEqual({ error: 'Splitting prompt is in use' });
  });

  it('validates categorisation label limit', async () => {
    const token = authToken('user_a');
    const labels = Array.from({ length: 21 }).map((_, index) => ({
      label: `L${index + 1}`,
      description: `Description ${index + 1}`
    }));

    const response = await request(app)
      .post('/api/categorisation-prompts')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Category Prompt',
        labels
      });

    expect(response.statusCode).toBe(400);
    expect(response.body).toEqual({ error: 'Categorisation labels cannot exceed 20 items' });
  });

  it('creates folder, holds documents, and sends out selected documents', async () => {
    const token = authToken('user_a');

    const createResponse = await request(app)
      .post('/api/document-folders')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Needs Review' });

    const folderId = createResponse.body.folder.id;

    await request(app)
      .post(`/api/document-folders/${folderId}/held-documents`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        document: { id: 'doc_1', fileName: 'invoice.pdf' },
        metadata: { totalAmount: 90 },
        workflowId: 'wf_1',
        workflowName: 'AP Workflow',
        nodeId: 'node_1',
        nodeName: 'Review Folder'
      });

    const sendOutResponse = await request(app)
      .post(`/api/document-folders/${folderId}/send-out`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        documentIds: ['doc_1']
      });

    expect(sendOutResponse.statusCode).toBe(200);
    expect(sendOutResponse.body.releasedDocuments).toHaveLength(1);
  });

  it('creates extractor and updates hold-all toggle', async () => {
    const token = authToken('user_a');

    const createResponse = await request(app)
      .post('/api/extractors')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Invoice Extractor',
        schema: {
          headerFields: [{ fieldName: 'InvoiceNumber', description: 'Invoice number' }],
          tableTypes: []
        }
      });

    const extractorId = createResponse.body.extractor.id;

    const patchResponse = await request(app)
      .patch(`/api/extractors/${extractorId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        holdAllDocuments: true
      });

    expect(patchResponse.statusCode).toBe(200);
    expect(patchResponse.body.extractor.holdAllDocuments).toBe(true);
  });
});
