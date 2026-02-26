import api from './api';

export async function listWorkflows() {
  const response = await api.get('/workflows');
  return response.data.workflows || [];
}

export async function createWorkflow(payload) {
  const response = await api.post('/workflows', payload);
  return response.data.workflow;
}

export async function updateWorkflow(workflowId, payload) {
  const response = await api.patch(`/workflows/${workflowId}`, payload);
  return response.data.workflow;
}

export async function deleteWorkflow(workflowId) {
  await api.delete(`/workflows/${workflowId}`);
}
