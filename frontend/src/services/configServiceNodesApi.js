import api from './api';

export async function listSplittingPrompts() {
  const response = await api.get('/splitting-prompts');
  return response.data.prompts || [];
}

export async function createSplittingPrompt(payload) {
  const response = await api.post('/splitting-prompts', payload);
  return response.data.prompt;
}

export async function updateSplittingPrompt(promptId, payload) {
  const response = await api.patch(`/splitting-prompts/${promptId}`, payload);
  return response.data.prompt;
}

export async function deleteSplittingPrompt(promptId) {
  await api.delete(`/splitting-prompts/${promptId}`);
}

export async function listCategorisationPrompts() {
  const response = await api.get('/categorisation-prompts');
  return response.data.prompts || [];
}

export async function createCategorisationPrompt(payload) {
  const response = await api.post('/categorisation-prompts', payload);
  return response.data.prompt;
}

export async function updateCategorisationPrompt(promptId, payload) {
  const response = await api.patch(`/categorisation-prompts/${promptId}`, payload);
  return response.data.prompt;
}

export async function deleteCategorisationPrompt(promptId) {
  await api.delete(`/categorisation-prompts/${promptId}`);
}

export async function listDocumentFolders() {
  const response = await api.get('/document-folders');
  return response.data.folders || [];
}

export async function createDocumentFolder(payload) {
  const response = await api.post('/document-folders', payload);
  return response.data.folder;
}

export async function updateDocumentFolder(folderId, payload) {
  const response = await api.patch(`/document-folders/${folderId}`, payload);
  return response.data.folder;
}

export async function deleteDocumentFolder(folderId) {
  await api.delete(`/document-folders/${folderId}`);
}

export async function sendOutFromFolder(folderId, payload) {
  const response = await api.post(`/document-folders/${folderId}/send-out`, payload);
  return response.data.releasedDocuments || [];
}

export async function listExtractors() {
  const response = await api.get('/extractors');
  return response.data.extractors || [];
}

export async function createExtractor(payload) {
  const response = await api.post('/extractors', payload);
  return response.data.extractor;
}

export async function addExtractorFeedback(extractorId, payload) {
  const response = await api.post(`/extractors/${extractorId}/feedbacks`, payload);
  return response.data.feedback;
}

export async function deleteExtractorFeedback(extractorId, feedbackId) {
  await api.delete(`/extractors/${extractorId}/feedbacks/${feedbackId}`);
}

export async function sendOutFromExtractor(extractorId, payload) {
  const response = await api.post(`/extractors/${extractorId}/send-out`, payload);
  return response.data.releasedDocuments || [];
}

export async function updateExtractor(extractorId, payload) {
  const response = await api.patch(`/extractors/${extractorId}`, payload);
  return response.data.extractor;
}

export async function deleteExtractor(extractorId) {
  await api.delete(`/extractors/${extractorId}`);
}
