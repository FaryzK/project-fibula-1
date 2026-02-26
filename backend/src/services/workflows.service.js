const { randomUUID } = require('crypto');

const workflowsById = new Map();

function listWorkflows(userId) {
  return Array.from(workflowsById.values())
    .filter((workflow) => workflow.userId === userId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

function createWorkflow(userId, payload) {
  const name = (payload?.name || '').trim() || 'Untitled Workflow';
  const now = new Date().toISOString();
  const workflow = {
    id: randomUUID(),
    userId,
    name,
    isPublished: false,
    createdAt: now,
    updatedAt: now
  };

  workflowsById.set(workflow.id, workflow);
  return workflow;
}

function getWorkflowForUser(userId, workflowId) {
  const workflow = workflowsById.get(workflowId);

  if (!workflow || workflow.userId !== userId) {
    return null;
  }

  return workflow;
}

function updateWorkflow(userId, workflowId, payload) {
  const existing = getWorkflowForUser(userId, workflowId);

  if (!existing) {
    return null;
  }

  const nextName =
    payload?.name !== undefined ? String(payload.name).trim() || existing.name : existing.name;
  const nextPublished =
    payload?.isPublished !== undefined ? Boolean(payload.isPublished) : existing.isPublished;

  const updated = {
    ...existing,
    name: nextName,
    isPublished: nextPublished,
    updatedAt: new Date().toISOString()
  };

  workflowsById.set(workflowId, updated);
  return updated;
}

function deleteWorkflow(userId, workflowId) {
  const existing = getWorkflowForUser(userId, workflowId);

  if (!existing) {
    return false;
  }

  workflowsById.delete(workflowId);
  return true;
}

function resetWorkflowsStore() {
  workflowsById.clear();
}

module.exports = {
  createWorkflow,
  deleteWorkflow,
  listWorkflows,
  resetWorkflowsStore,
  updateWorkflow
};
