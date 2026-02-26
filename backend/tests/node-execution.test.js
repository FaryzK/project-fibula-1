const {
  executeHttpNode,
  executeIfNode,
  executeManualUploadNode,
  executeSetValueNode,
  executeSwitchNode,
  executeWebhookNode
} = require('../src/services/node-execution.service');

describe('node execution service', () => {
  const basePayload = {
    document: { id: 'doc_1', fileName: 'invoice.pdf' },
    metadata: {
      totalAmount: 95,
      vendor: {
        name: 'Acme Corporation'
      },
      approved: false
    }
  };

  it('manual upload returns input document unchanged', () => {
    const result = executeManualUploadNode(basePayload);

    expect(result).toEqual({
      document: basePayload.document,
      metadata: basePayload.metadata
    });
  });

  it('if node returns true branch when condition is met', () => {
    const result = executeIfNode({
      ...basePayload,
      config: {
        logic: 'AND',
        rules: [
          {
            fieldPath: 'totalAmount',
            dataType: 'number',
            operator: 'less_than',
            value: 100
          }
        ]
      }
    });

    expect(result.branch).toBe('true');
  });

  it('if node supports OR logic across multiple rules', () => {
    const result = executeIfNode({
      ...basePayload,
      config: {
        logic: 'OR',
        rules: [
          {
            fieldPath: 'approved',
            dataType: 'boolean',
            operator: 'is_true'
          },
          {
            fieldPath: 'vendor.name',
            dataType: 'string',
            operator: 'contains',
            value: 'Acme'
          }
        ]
      }
    });

    expect(result.branch).toBe('true');
  });

  it('switch node returns first matching case branch', () => {
    const result = executeSwitchNode({
      ...basePayload,
      config: {
        cases: [
          {
            id: 'case_1',
            rule: {
              fieldPath: 'totalAmount',
              dataType: 'number',
              operator: 'greater_than',
              value: 1000
            }
          },
          {
            id: 'case_2',
            rule: {
              fieldPath: 'vendor.name',
              dataType: 'string',
              operator: 'contains',
              value: 'Acme'
            }
          }
        ]
      }
    });

    expect(result.branch).toBe('case_2');
  });

  it('switch node returns fallback when no cases match', () => {
    const result = executeSwitchNode({
      ...basePayload,
      config: {
        cases: [
          {
            id: 'case_1',
            rule: {
              fieldPath: 'totalAmount',
              dataType: 'number',
              operator: 'greater_than',
              value: 500
            }
          }
        ]
      }
    });

    expect(result.branch).toBe('fallback');
  });

  it('set value node enriches metadata at nested path', () => {
    const result = executeSetValueNode({
      ...basePayload,
      config: {
        assignments: [
          { fieldPath: 'approval.status', value: 'approved' },
          { fieldPath: 'approved', value: true }
        ]
      }
    });

    expect(result.metadata.approval.status).toBe('approved');
    expect(result.metadata.approved).toBe(true);
    expect(result.document).toEqual(basePayload.document);
  });

  it('webhook node uses inbound JSON payload as metadata without document', () => {
    const result = executeWebhookNode({
      webhookPayload: {
        body: {
          invoiceNumber: 'INV-100',
          totalAmount: 120.5
        }
      }
    });

    expect(result).toEqual({
      document: null,
      metadata: {
        invoiceNumber: 'INV-100',
        totalAmount: 120.5
      }
    });
  });

  it('webhook node treats inbound file as document and excludes it from metadata', () => {
    const result = executeWebhookNode({
      webhookPayload: {
        body: {
          vendorName: 'Acme',
          file: {
            fileName: 'invoice.pdf',
            mimeType: 'application/pdf'
          }
        }
      }
    });

    expect(result).toEqual({
      document: {
        fileName: 'invoice.pdf',
        mimeType: 'application/pdf'
      },
      metadata: {
        vendorName: 'Acme'
      }
    });
  });

  it('http node resolves template expressions and appends response metadata', async () => {
    const requestFn = jest.fn().mockResolvedValue({
      status: 201,
      body: { exportId: 'exp_1' }
    });

    const result = await executeHttpNode(
      {
        ...basePayload,
        config: {
          url: 'https://example.test/export/{{ $metadata.vendor.name }}',
          method: 'POST',
          headers: {
            Authorization: 'Bearer token',
            'X-Doc-Id': '{{ $document.id }}'
          },
          body: {
            invoiceFile: '{{ $document.fileName }}',
            totalAmount: '{{ $metadata.totalAmount }}'
          }
        }
      },
      { requestFn }
    );

    expect(requestFn).toHaveBeenCalledWith({
      url: 'https://example.test/export/Acme Corporation',
      method: 'POST',
      headers: {
        Authorization: 'Bearer token',
        'X-Doc-Id': 'doc_1'
      },
      body: {
        invoiceFile: 'invoice.pdf',
        totalAmount: 95
      }
    });
    expect(result.document).toEqual(basePayload.document);
    expect(result.metadata.httpResponse).toEqual({
      statusCode: 201,
      body: { exportId: 'exp_1' }
    });
  });

  it('http node throws when outbound request returns non-2xx', async () => {
    const requestFn = jest.fn().mockResolvedValue({
      status: 500,
      body: { error: 'downstream failed' }
    });

    await expect(
      executeHttpNode(
        {
          ...basePayload,
          config: {
            url: 'https://example.test/export',
            method: 'POST',
            headers: {},
            body: {}
          }
        },
        { requestFn }
      )
    ).rejects.toThrow('HTTP request failed with status 500');
  });
});
