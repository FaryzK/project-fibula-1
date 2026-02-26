import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { getNodePorts } from '../../pages/coreNodeUtils';

export function CanvasNodeCard({ id, data }) {
  const ports = getNodePorts({
    nodeTypeKey: data.nodeTypeKey,
    config: data.config
  });

  return (
    <div
      onDoubleClick={() => data.onRename(id)}
      style={{
        width: 190,
        minHeight: 84,
        border: '1px solid #7f95b8',
        borderRadius: 12,
        background: 'linear-gradient(180deg, #ffffff, #eef4ff)',
        boxShadow: '0 7px 20px rgba(15, 23, 42, 0.14)',
        padding: '10px 12px',
        position: 'relative'
      }}
    >
      {ports.inputs.map((port, index) => {
        const top = ports.inputs.length === 1 ? '50%' : `${((index + 1) / (ports.inputs.length + 1)) * 100}%`;

        return (
          <Handle
            key={port.id}
            type="target"
            position={Position.Left}
            id={port.id}
            style={{ top, width: 8, height: 8, background: '#1f5f97' }}
          />
        );
      })}

      <div style={{ fontSize: 14, fontWeight: 700 }}>
        <span style={{ marginRight: 6 }}>{data.icon}</span>
        <span>{data.label}</span>
      </div>
      <div style={{ marginTop: 6, fontSize: 11, opacity: 0.7 }}>{data.nodeTypeKey}</div>

      {ports.outputs.map((port, index) => {
        const top =
          ports.outputs.length === 1 ? '50%' : `${((index + 1) / (ports.outputs.length + 1)) * 100}%`;

        return (
          <Handle
            key={port.id}
            type="source"
            position={Position.Right}
            id={port.id}
            style={{ top, width: 8, height: 8, background: '#1f5f97' }}
          />
        );
      })}

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
          border: '1px solid #1f5f97',
          background: '#ffffff',
          fontWeight: 700,
          cursor: 'pointer'
        }}
      >
        +
      </button>
    </div>
  );
}
