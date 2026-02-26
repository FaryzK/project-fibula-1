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
      className="canvas-node"
      onDoubleClick={() => data.onRename(id)}
    >
      {ports.inputs.map((port, index) => {
        const top =
          ports.inputs.length === 1 ? '50%' : `${((index + 1) / (ports.inputs.length + 1)) * 100}%`;

        return (
          <Handle
            key={port.id}
            type="target"
            position={Position.Left}
            id={port.id}
            className="canvas-node-handle"
            style={{ top }}
          />
        );
      })}

      <div className="canvas-node-title">
        <span>{data.icon}</span>
        <span>{data.label}</span>
      </div>
      <div className="canvas-node-meta">{data.nodeTypeKey}</div>

      {ports.outputs.map((port, index) => {
        const top =
          ports.outputs.length === 1 ? '50%' : `${((index + 1) / (ports.outputs.length + 1)) * 100}%`;

        return (
          <Handle
            key={port.id}
            type="source"
            position={Position.Right}
            id={port.id}
            className="canvas-node-handle"
            style={{ top }}
          />
        );
      })}

      <button
        type="button"
        className="node-quick-add"
        onClick={(event) => {
          event.stopPropagation();
          data.onQuickAdd(id);
        }}
        title="Quick add connected node"
      >
        +
      </button>
    </div>
  );
}
