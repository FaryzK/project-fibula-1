import { describe, expect, it } from 'vitest';
import {
  applySetValuePreview,
  evaluateIfNodePreview,
  evaluateSwitchNodePreview,
  getDefaultNodeConfig,
  getNodePorts
} from './coreNodeUtils';

describe('coreNodeUtils', () => {
  it('provides switch default config with fallback-capable cases', () => {
    const config = getDefaultNodeConfig('switch');

    expect(config.cases).toHaveLength(1);
    expect(config.cases[0].id).toBe('case_1');
  });

  it('returns fallback output port for switch nodes', () => {
    const ports = getNodePorts({
      nodeTypeKey: 'switch',
      config: {
        cases: [{ id: 'case_1', label: 'Case 1' }, { id: 'case_2', label: 'Case 2' }]
      }
    });

    expect(ports.outputs.map((port) => port.id)).toEqual([
      'out-case_1',
      'out-case_2',
      'out-fallback'
    ]);
  });

  it('returns webhook as trigger output-only node', () => {
    const ports = getNodePorts({
      nodeTypeKey: 'webhook',
      config: {}
    });

    expect(ports.inputs).toEqual([]);
    expect(ports.outputs).toEqual([{ id: 'out-primary', label: 'Out' }]);
  });

  it('evaluates IF preview with AND/OR logic', () => {
    const metadata = { totalAmount: 60, approved: false };
    const config = {
      logic: 'OR',
      rules: [
        {
          fieldPath: 'approved',
          dataType: 'boolean',
          operator: 'is_true'
        },
        {
          fieldPath: 'totalAmount',
          dataType: 'number',
          operator: 'less_than',
          value: 100
        }
      ]
    };

    expect(evaluateIfNodePreview(metadata, config)).toBe('true');
  });

  it('evaluates SWITCH preview and returns fallback when no case matches', () => {
    const metadata = { vendorName: 'Contoso' };
    const config = {
      cases: [
        {
          id: 'case_1',
          rule: {
            fieldPath: 'vendorName',
            dataType: 'string',
            operator: 'contains',
            value: 'Acme'
          }
        }
      ]
    };

    expect(evaluateSwitchNodePreview(metadata, config)).toBe('fallback');
  });

  it('applies set value preview updates on nested metadata path', () => {
    const metadata = { approval: { status: 'pending' } };
    const config = {
      assignments: [{ fieldPath: 'approval.status', value: 'approved' }]
    };

    const result = applySetValuePreview(metadata, config);

    expect(result.approval.status).toBe('approved');
  });

  it('provides webhook and HTTP default configs', () => {
    const webhookConfig = getDefaultNodeConfig('webhook');
    const httpConfig = getDefaultNodeConfig('http');

    expect(webhookConfig.expectedMethod).toBe('POST');
    expect(webhookConfig.description).toBe('');
    expect(httpConfig.method).toBe('POST');
    expect(httpConfig.url).toBe('');
  });
});
