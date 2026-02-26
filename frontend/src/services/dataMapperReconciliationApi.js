import api from './api';

export async function listDataMapSets() {
  const response = await api.get('/data-map-sets');
  return response.data.sets || [];
}

export async function createDataMapSet(payload) {
  const response = await api.post('/data-map-sets', payload);
  return response.data.set;
}

export async function updateDataMapSet(setId, payload) {
  const response = await api.patch(`/data-map-sets/${setId}`, payload);
  return response.data.set;
}

export async function deleteDataMapSet(setId) {
  await api.delete(`/data-map-sets/${setId}`);
}

export async function listDataMapRules() {
  const response = await api.get('/data-map-rules');
  return response.data.rules || [];
}

export async function createDataMapRule(payload) {
  const response = await api.post('/data-map-rules', payload);
  return response.data.rule;
}

export async function updateDataMapRule(ruleId, payload) {
  const response = await api.patch(`/data-map-rules/${ruleId}`, payload);
  return response.data.rule;
}

export async function deleteDataMapRule(ruleId) {
  await api.delete(`/data-map-rules/${ruleId}`);
}

export async function listReconciliationRules() {
  const response = await api.get('/reconciliation-rules');
  return response.data.rules || [];
}

export async function createReconciliationRule(payload) {
  const response = await api.post('/reconciliation-rules', payload);
  return response.data.rule;
}

export async function updateReconciliationRule(ruleId, payload) {
  const response = await api.patch(`/reconciliation-rules/${ruleId}`, payload);
  return response.data.rule;
}

export async function deleteReconciliationRule(ruleId) {
  await api.delete(`/reconciliation-rules/${ruleId}`);
}

export async function listMatchingSets(ruleId) {
  const response = await api.get(`/reconciliation-rules/${ruleId}/matching-sets`);
  return response.data.matchingSets || [];
}

export async function createMatchingSet(ruleId, payload) {
  const response = await api.post(`/reconciliation-rules/${ruleId}/matching-sets`, payload);
  return response.data.matchingSet;
}

export async function forceReconcileMatchingSet(ruleId, matchingSetId) {
  const response = await api.post(
    `/reconciliation-rules/${ruleId}/matching-sets/${matchingSetId}/force-reconcile`
  );
  return response.data.matchingSet;
}

export async function rejectMatchingSet(ruleId, matchingSetId) {
  const response = await api.post(
    `/reconciliation-rules/${ruleId}/matching-sets/${matchingSetId}/reject`
  );
  return response.data.matchingSet;
}
