const { randomUUID } = require('crypto');
const { isDatabaseEnabled } = require('../db/postgres');
const {
  deleteEntity,
  getEntity,
  insertEntity,
  listEntities,
  updateEntity
} = require('../db/entity-store');

const workflowsById = new Map();
const TABLE = 'workflows';

function useMemoryStore() {
  return !isDatabaseEnabled();
}

function listWorkflowsMemory(userId) {
  return Array.from(workflowsById.values())
    .filter((workflow) => workflow.userId === userId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

async function listWorkflows(userId) {
  if (useMemoryStore()) {
    return listWorkflowsMemory(userId);
  }

  return listEntities(TABLE, userId);
}

async function createWorkflow(userId, payload) {
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

  if (useMemoryStore()) {
    workflowsById.set(workflow.id, workflow);
    return workflow;
  }

  return insertEntity(TABLE, {
    id: workflow.id,
    userId,
    data: {
      name: workflow.name,
      isPublished: workflow.isPublished
    },
    createdAt: workflow.createdAt,
    updatedAt: workflow.updatedAt
  });
}

async function getWorkflowForUser(userId, workflowId) {
  if (useMemoryStore()) {
    const workflow = workflowsById.get(workflowId);
    if (!workflow || workflow.userId !== userId) {
      return null;
    }

    return workflow;
  }

  return getEntity(TABLE, userId, workflowId);
}

async function updateWorkflow(userId, workflowId, payload) {
  if (useMemoryStore()) {
    const existing = await getWorkflowForUser(userId, workflowId);

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

  const existing = await getEntity(TABLE, userId, workflowId);

  if (!existing) {
    return null;
  }

  const nextName =
    payload?.name !== undefined ? String(payload.name).trim() || existing.name : existing.name;
  const nextPublished =
    payload?.isPublished !== undefined ? Boolean(payload.isPublished) : existing.isPublished;
  const updatedAt = new Date().toISOString();

  return updateEntity(
    TABLE,
    userId,
    workflowId,
    {
      name: nextName,
      isPublished: nextPublished
    },
    updatedAt
  );
}

async function deleteWorkflow(userId, workflowId) {
  if (useMemoryStore()) {
    const existing = await getWorkflowForUser(userId, workflowId);

    if (!existing) {
      return false;
    }

    workflowsById.delete(workflowId);
    return true;
  }

  return deleteEntity(TABLE, userId, workflowId);
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
