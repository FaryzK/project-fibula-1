const { executeWebhookNode } = require('./node-execution.service');

function normalizeExecutionMode(mode) {
  const normalized = String(mode || 'published').toLowerCase();

  if (normalized === 'drop-only') {
    return 'drop-only';
  }

  if (normalized === 'run-to-node') {
    return 'run-to-node';
  }

  return 'published';
}

function receiveWebhookEvent({ workflowId, nodeId, mode, targetNodeId, body }) {
  const executionMode = normalizeExecutionMode(mode);
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
