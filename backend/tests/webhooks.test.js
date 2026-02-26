const request = require('supertest');
const app = require('../src/app');

describe('Webhooks API', () => {
  it('accepts webhook POST and normalizes inbound payload', async () => {
    const response = await request(app)
      .post('/api/webhooks/wf_1/node_1')
      .send({
        invoiceNumber: 'INV-100',
        totalAmount: 250.25
      });

    expect(response.statusCode).toBe(202);
    expect(response.body).toEqual({
      accepted: true,
      workflowId: 'wf_1',
      nodeId: 'node_1',
      executionMode: 'published',
      output: {
        document: null,
        metadata: {
          invoiceNumber: 'INV-100',
          totalAmount: 250.25
        }
      }
    });
  });

  it('supports drop-only staging mode for unpublished behavior', async () => {
    const response = await request(app)
      .post('/api/webhooks/wf_2/node_5?mode=drop-only')
      .send({
        document: {
          fileName: 'invoice.pdf'
        },
        source: 'external-system'
      });

    expect(response.statusCode).toBe(202);
    expect(response.body.executionMode).toBe('drop-only');
    expect(response.body.output.document).toEqual({ fileName: 'invoice.pdf' });
    expect(response.body.output.metadata).toEqual({ source: 'external-system' });
  });
});
