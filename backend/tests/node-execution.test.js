const {
  executeIfNode,
  executeManualUploadNode,
  executeSetValueNode,
  executeSwitchNode
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
});
