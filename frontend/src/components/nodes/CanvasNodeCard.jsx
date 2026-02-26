import React from 'react';
import { Handle, Position } from '@xyflow/react';

export function CanvasNodeCard({ id, data }) {
  return (
    <div
      onDoubleClick={() => data.onRename(id)}
      style={{
        width: 190,
        minHeight: 84,
        border: '1px solid #111827',
        borderRadius: 10,
        background: '#ffffff',
        boxShadow: '0 6px 18px rgba(15, 23, 42, 0.12)',
        padding: '10px 12px',
        position: 'relative'
      }}
    >
      <Handle
        type="target"
        position={Position.Left}
        id="in-primary"
        style={{ top: '35%', width: 8, height: 8, background: '#0f172a' }}
      />
      <Handle
        type="target"
        position={Position.Left}
        id="in-secondary"
        style={{ top: '70%', width: 8, height: 8, background: '#0f172a' }}
      />

      <div style={{ fontSize: 14, fontWeight: 700 }}>
        <span style={{ marginRight: 6 }}>{data.icon}</span>
        <span>{data.label}</span>
      </div>
      <div style={{ marginTop: 6, fontSize: 11, opacity: 0.7 }}>{data.nodeTypeKey}</div>

      <Handle
        type="source"
        position={Position.Right}
        id="out-primary"
        style={{ top: '35%', width: 8, height: 8, background: '#0f172a' }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="out-secondary"
        style={{ top: '70%', width: 8, height: 8, background: '#0f172a' }}
      />

      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          data.onQuickAdd(id);
        }}
        title="Quick add connected node"
        style={{
          position: 'absolute',
          right: -16,
          top: '50%',
          transform: 'translateY(-50%)',
          width: 26,
          height: 26,
          borderRadius: '50%',
          border: '1px solid #1f2937',
          background: '#f8fafc',
          fontWeight: 700,
          cursor: 'pointer'
        }}
      >
        +
      </button>
    </div>
  );
}
