const { executeWebhookNode } = require('./node-execution.service');

function normalizeExecutionMode(mode) {
  if (mode === undefined || mode === null || mode === '') {
    return 'published';
  }

  const normalized = String(mode || 'published').toLowerCase();

  if (normalized === 'drop-only') {
    return 'drop-only';
  }

  if (normalized === 'run-to-node') {
    return 'run-to-node';
  }

  const error = new Error('Invalid webhook execution mode');
  error.statusCode = 400;
  throw error;
}

function receiveWebhookEvent({ workflowId, nodeId, mode, targetNodeId, body }) {
  const executionMode = normalizeExecutionMode(mode);

  if (executionMode === 'run-to-node' && !targetNodeId) {
    const error = new Error('targetNodeId is required for run-to-node mode');
    error.statusCode = 400;
    throw error;
  }

  const output = executeWebhookNode({
    webhookPayload: {
      body
    }
  });

  return {
    accepted: true,
    workflowId,
    nodeId,
    executionMode,
    ...(executionMode === 'run-to-node' && targetNodeId ? { targetNodeId } : {}),
    output
  };
}

module.exports = {
  receiveWebhookEvent
};
