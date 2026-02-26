const jwt = require('jsonwebtoken');
const request = require('supertest');
const app = require('../src/app');
const {
  resetDataMapperReconciliationStore
} = require('../src/services/data-mapper-reconciliation.service');

function tokenFor(userId) {
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

describe('Data mapper and reconciliation APIs', () => {
  beforeAll(() => {
    process.env.SUPABASE_JWT_SECRET = 'test-supabase-secret';
  });

  beforeEach(() => {
    resetDataMapperReconciliationStore();
  });

  it('creates and lists data map sets', async () => {
    const token = tokenFor('user_a');

    const createResponse = await request(app)
      .post('/api/data-map-sets')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Vendor Master Data',
        headers: ['VendorName', 'VendorCode'],
        records: [{ VendorName: 'Acme', VendorCode: 'V001' }]
      });

    expect(createResponse.statusCode).toBe(201);
    expect(createResponse.body.set.name).toBe('Vendor Master Data');

    const listResponse = await request(app)
      .get('/api/data-map-sets')
      .set('Authorization', `Bearer ${token}`);

    expect(listResponse.statusCode).toBe(200);
    expect(listResponse.body.sets).toHaveLength(1);
  });

  it('prevents deleting data map set used by a rule', async () => {
    const token = tokenFor('user_a');

    const createSetResponse = await request(app)
      .post('/api/data-map-sets')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Vendor Master Data',
        headers: ['VendorName', 'VendorCode'],
        records: [{ VendorName: 'Acme', VendorCode: 'V001' }]
      });

    const setId = createSetResponse.body.set.id;

    await request(app)
      .post('/api/data-map-rules')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Populate Vendor Code',
        extractorName: 'Invoice Extractor',
        mapTargets: [{ schemaFieldPath: 'vendor.code', setColumn: 'VendorCode', mode: 'map' }],
        lookups: [
          {
            setId,
            setColumn: 'VendorName',
            schemaFieldPath: 'vendor.name',
            matchType: 'exact'
          }
        ]
      });

    const deleteResponse = await request(app)
      .delete(`/api/data-map-sets/${setId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(deleteResponse.statusCode).toBe(409);
    expect(deleteResponse.body).toEqual({ error: 'Data map set is in use by a data map rule' });
  });

  it('creates and lists reconciliation rules', async () => {
    const token = tokenFor('user_a');

    const createResponse = await request(app)
      .post('/api/reconciliation-rules')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'PO Invoice Reconciliation',
        anchorExtractor: 'PO Extractor',
        targetExtractors: ['Invoice Extractor'],
        variations: [
          {
            name: 'Variation 1',
            documentMatching: [{ leftFieldPath: 'poNumber', rightFieldPath: 'invoicePoNumber' }],
            tableMatching: [{ leftFieldPath: 'partNumber', rightFieldPath: 'sku' }],
            comparisons: [{ formula: 'invoice.total = po.total', toleranceType: 'absolute', toleranceValue: 1 }]
          }
        ]
      });

    expect(createResponse.statusCode).toBe(201);
    expect(createResponse.body.rule.anchorExtractor).toBe('PO Extractor');

    const listResponse = await request(app)
      .get('/api/reconciliation-rules')
      .set('Authorization', `Bearer ${token}`);

    expect(listResponse.statusCode).toBe(200);
    expect(listResponse.body.rules).toHaveLength(1);
  });

  it('creates matching set and supports force reconcile and reject', async () => {
    const token = tokenFor('user_a');

    const createRuleResponse = await request(app)
      .post('/api/reconciliation-rules')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'PO Invoice Reconciliation',
        anchorExtractor: 'PO Extractor',
        targetExtractors: ['Invoice Extractor'],
        variations: []
      });

    const ruleId = createRuleResponse.body.rule.id;

    const createMatchingSetResponse = await request(app)
      .post(`/api/reconciliation-rules/${ruleId}/matching-sets`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        anchorDocument: { id: 'po_1', documentName: 'po.pdf' },
        documents: [{ id: 'inv_1', documentName: 'inv.pdf' }],
        comparisonRows: [{ key: 'total', leftValue: 100, rightValue: 102, status: 'mismatch' }]
      });

    expect(createMatchingSetResponse.statusCode).toBe(201);
    const matchingSetId = createMatchingSetResponse.body.matchingSet.id;

    const forceResponse = await request(app)
      .post(`/api/reconciliation-rules/${ruleId}/matching-sets/${matchingSetId}/force-reconcile`)
      .set('Authorization', `Bearer ${token}`);

    expect(forceResponse.statusCode).toBe(200);
    expect(forceResponse.body.matchingSet.status).toBe('force_reconciled');

    const rejectResponse = await request(app)
      .post(`/api/reconciliation-rules/${ruleId}/matching-sets/${matchingSetId}/reject`)
      .set('Authorization', `Bearer ${token}`);

    expect(rejectResponse.statusCode).toBe(200);
    expect(rejectResponse.body.matchingSet.status).toBe('rejected');
  });
});
