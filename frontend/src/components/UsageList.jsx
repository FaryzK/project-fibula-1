import React from 'react';
import { Link } from 'react-router-dom';

export function UsageList({ usages = [], emptyText = 'Not used in any workflows yet.' }) {
  if (!usages.length) {
    return <p className="muted-text">{emptyText}</p>;
  }

  return (
    <div className="usage-list">
      {usages.map((usage, index) => {
        const workflowLabel = usage.workflowName || 'Workflow';
        const nodeLabel = usage.nodeName || usage.nodeId || 'Node';
        const to = usage.workflowId
          ? `/app/workflows/${usage.workflowId}/canvas?nodeId=${usage.nodeId}`
          : null;
        const key = `${usage.workflowId || 'workflow'}-${usage.nodeId || 'node'}-${index}`;

        const content = (
          <>
            <div>
              <div className="usage-title">{workflowLabel}</div>
              <div className="usage-meta">Node: {nodeLabel}</div>
            </div>
            {to ? <span className="usage-link">Open canvas</span> : null}
          </>
        );

        if (!to) {
          return (
            <div className="usage-item" key={key}>
              {content}
            </div>
          );
        }

        return (
          <Link className="usage-item" key={key} to={to}>
            {content}
          </Link>
        );
      })}
    </div>
  );
}
