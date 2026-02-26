import React from 'react';
import { Link, useParams } from 'react-router-dom';

export function WorkflowCanvasPage() {
  const { workflowId } = useParams();

  return (
    <main style={{ fontFamily: 'system-ui', padding: '2rem' }}>
      <h1>Workflow Canvas</h1>
      <p>Workflow ID: {workflowId}</p>
      <p>Canvas interactions will be implemented in Phase 3.</p>
      <p>
        <Link to="/app">Back to Workflow Tab</Link>
      </p>
    </main>
  );
}
