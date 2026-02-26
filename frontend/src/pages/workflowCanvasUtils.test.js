import { describe, expect, it } from 'vitest';
import {
  filterNodeTemplates,
  findRecenterTarget,
  getNextAvailablePosition
} from './workflowCanvasUtils';

describe('workflowCanvasUtils', () => {
  it('places node at desired position when no collision exists', () => {
    const position = getNextAvailablePosition({
      desiredPosition: { x: 100, y: 100 },
      existingNodes: []
    });

    expect(position).toEqual({ x: 100, y: 100 });
  });

  it('applies anti-collision offset when desired position is occupied', () => {
    const position = getNextAvailablePosition({
      desiredPosition: { x: 100, y: 100 },
      existingNodes: [{ id: 'n1', position: { x: 100, y: 100 } }]
    });

    expect(position).toEqual({ x: 220, y: 20 });
  });

  it('filters node templates by case-insensitive search query', () => {
    const results = filterNodeTemplates(
      [
        { key: 'manual_upload', label: 'Manual Upload' },
        { key: 'if', label: 'IF' },
        { key: 'switch', label: 'SWITCH' }
      ],
      'sw'
    );

    expect(results).toEqual([{ key: 'switch', label: 'SWITCH' }]);
  });

  it('recenter target defaults to origin when no nodes exist', () => {
    const target = findRecenterTarget([]);

    expect(target).toEqual({ x: 0, y: 0 });
  });

  it('recenter target uses oldest placed node', () => {
    const target = findRecenterTarget([
      {
        id: 'n2',
        position: { x: 400, y: 300 },
        data: { createdAt: '2026-02-26T10:00:00.000Z' }
      },
      {
        id: 'n1',
        position: { x: 200, y: 120 },
        data: { createdAt: '2026-02-26T09:00:00.000Z' }
      }
    ]);

    expect(target).toEqual({ x: 200, y: 120 });
  });
});
