const { randomUUID } = require('crypto');

const splittingPromptsById = new Map();
const categorisationPromptsById = new Map();
const documentFoldersById = new Map();
const extractorsById = new Map();

function isOwnedByUser(item, userId) {
  return item && item.userId === userId;
}

function toPreview(text) {
  const content = String(text || '').trim();
  if (content.length <= 80) {
    return content;
  }

  return `${content.slice(0, 77)}...`;
}

function listByOwner(store, userId) {
  return Array.from(store.values())
    .filter((item) => isOwnedByUser(item, userId))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

function createSplittingPrompt(userId, payload) {
  const now = new Date().toISOString();
  const prompt = {
    id: randomUUID(),
    userId,
    name: (payload.name || '').trim() || 'Untitled Splitting Prompt',
    instructions: payload.instructions || '',
    instructionsPreview: toPreview(payload.instructions),
    nodeUsages: [],
    createdAt: now,
    updatedAt: now
  };

  splittingPromptsById.set(prompt.id, prompt);
  return prompt;
}

function listSplittingPrompts(userId) {
  return listByOwner(splittingPromptsById, userId);
}

function updateSplittingPrompt(userId, promptId, payload) {
  const existing = splittingPromptsById.get(promptId);

  if (!isOwnedByUser(existing, userId)) {
    return null;
  }

  const updated = {
    ...existing,
    ...(payload.name !== undefined ? { name: payload.name.trim() || existing.name } : {}),
    ...(payload.instructions !== undefined
      ? {
          instructions: payload.instructions,
          instructionsPreview: toPreview(payload.instructions)
        }
      : {}),
    ...(Array.isArray(payload.nodeUsages) ? { nodeUsages: payload.nodeUsages } : {}),
    updatedAt: new Date().toISOString()
  };

  splittingPromptsById.set(promptId, updated);
  return updated;
}

function deleteSplittingPrompt(userId, promptId) {
  const existing = splittingPromptsById.get(promptId);

  if (!isOwnedByUser(existing, userId)) {
    return { success: false, reason: 'not_found' };
  }

  if (existing.nodeUsages?.length) {
    return { success: false, reason: 'in_use' };
  }

  splittingPromptsById.delete(promptId);
  return { success: true };
}

function validateCategorisationLabels(labels) {
  if (!Array.isArray(labels)) {
    return null;
  }

  if (labels.length > 20) {
    return 'Categorisation labels cannot exceed 20 items';
  }

  return null;
}

function createCategorisationPrompt(userId, payload) {
  const validationError = validateCategorisationLabels(payload.labels || []);

  if (validationError) {
    return { error: validationError };
  }

  const now = new Date().toISOString();
  const prompt = {
    id: randomUUID(),
    userId,
    name: (payload.name || '').trim() || 'Untitled Categorisation Prompt',
    labels: payload.labels || [],
    nodeUsages: [],
    createdAt: now,
    updatedAt: now
  };

  categorisationPromptsById.set(prompt.id, prompt);
  return { prompt };
}

function listCategorisationPrompts(userId) {
  return listByOwner(categorisationPromptsById, userId);
}

function updateCategorisationPrompt(userId, promptId, payload) {
  const existing = categorisationPromptsById.get(promptId);

  if (!isOwnedByUser(existing, userId)) {
    return { prompt: null };
  }

  const validationError = validateCategorisationLabels(payload.labels || existing.labels || []);

  if (validationError) {
    return { error: validationError };
  }

  const updated = {
    ...existing,
    ...(payload.name !== undefined ? { name: payload.name.trim() || existing.name } : {}),
    ...(payload.labels !== undefined ? { labels: payload.labels } : {}),
    ...(Array.isArray(payload.nodeUsages) ? { nodeUsages: payload.nodeUsages } : {}),
    updatedAt: new Date().toISOString()
  };

  categorisationPromptsById.set(promptId, updated);
  return { prompt: updated };
}

function deleteCategorisationPrompt(userId, promptId) {
  const existing = categorisationPromptsById.get(promptId);

  if (!isOwnedByUser(existing, userId)) {
    return { success: false, reason: 'not_found' };
  }

  if (existing.nodeUsages?.length) {
    return { success: false, reason: 'in_use' };
  }

  categorisationPromptsById.delete(promptId);
  return { success: true };
}

function createDocumentFolder(userId, payload) {
  const now = new Date().toISOString();
  const folder = {
    id: randomUUID(),
    userId,
    name: (payload.name || '').trim() || 'Untitled Folder',
    heldDocuments: [],
    nodeUsages: [],
    createdAt: now,
    updatedAt: now
  };

  documentFoldersById.set(folder.id, folder);
  return folder;
}

function listDocumentFolders(userId) {
  return listByOwner(documentFoldersById, userId).map((folder) => ({
    ...folder,
    heldDocumentCount: folder.heldDocuments.length
  }));
}

function updateDocumentFolder(userId, folderId, payload) {
  const existing = documentFoldersById.get(folderId);

  if (!isOwnedByUser(existing, userId)) {
    return null;
  }

  const updated = {
    ...existing,
    ...(payload.name !== undefined ? { name: payload.name.trim() || existing.name } : {}),
    ...(Array.isArray(payload.nodeUsages) ? { nodeUsages: payload.nodeUsages } : {}),
    updatedAt: new Date().toISOString()
  };

  documentFoldersById.set(folderId, updated);
  return updated;
}

function deleteDocumentFolder(userId, folderId) {
  const existing = documentFoldersById.get(folderId);

  if (!isOwnedByUser(existing, userId)) {
    return { success: false, reason: 'not_found' };
  }

  if (existing.nodeUsages?.length) {
    return { success: false, reason: 'in_use' };
  }

  documentFoldersById.delete(folderId);
  return { success: true };
}

function holdDocumentInFolder(userId, folderId, payload) {
  const existing = documentFoldersById.get(folderId);

  if (!isOwnedByUser(existing, userId)) {
    return null;
  }

  const heldRecord = {
    document: payload.document || null,
    metadata: payload.metadata || {},
    workflowId: payload.workflowId || null,
    workflowName: payload.workflowName || null,
    nodeId: payload.nodeId || null,
    nodeName: payload.nodeName || null,
    arrivedAt: new Date().toISOString()
  };

  const updated = {
    ...existing,
    heldDocuments: [...existing.heldDocuments, heldRecord],
    updatedAt: new Date().toISOString()
  };

  documentFoldersById.set(folderId, updated);
  return heldRecord;
}

function sendOutFromFolder(userId, folderId, documentIds) {
  const existing = documentFoldersById.get(folderId);

  if (!isOwnedByUser(existing, userId)) {
    return null;
  }

  const ids = new Set(documentIds || []);
  const releasedDocuments = [];
  const remainingDocuments = [];

  existing.heldDocuments.forEach((heldDocument) => {
    const heldId = heldDocument.document?.id;

    if (heldId && ids.has(heldId)) {
      releasedDocuments.push(heldDocument);
      return;
    }

    remainingDocuments.push(heldDocument);
  });

  const updated = {
    ...existing,
    heldDocuments: remainingDocuments,
    updatedAt: new Date().toISOString()
  };

  documentFoldersById.set(folderId, updated);
  return releasedDocuments;
}

function createExtractor(userId, payload) {
  const now = new Date().toISOString();
  const extractor = {
    id: randomUUID(),
    userId,
    name: (payload.name || '').trim() || 'Untitled Extractor',
    schema: payload.schema || { headerFields: [], tableTypes: [] },
    holdAllDocuments: false,
    heldDocuments: [],
    feedbacks: [],
    nodeUsages: [],
    createdAt: now,
    updatedAt: now
  };

  extractorsById.set(extractor.id, extractor);
  return extractor;
}

function listExtractors(userId) {
  return listByOwner(extractorsById, userId).map((extractor) => ({
    ...extractor,
    heldDocumentCount: extractor.heldDocuments.length,
    feedbackCount: extractor.feedbacks.length
  }));
}

function updateExtractor(userId, extractorId, payload) {
  const existing = extractorsById.get(extractorId);

  if (!isOwnedByUser(existing, userId)) {
    return null;
  }

  const updated = {
    ...existing,
    ...(payload.name !== undefined ? { name: payload.name.trim() || existing.name } : {}),
    ...(payload.schema !== undefined ? { schema: payload.schema } : {}),
    ...(payload.holdAllDocuments !== undefined
      ? { holdAllDocuments: Boolean(payload.holdAllDocuments) }
      : {}),
    ...(Array.isArray(payload.nodeUsages) ? { nodeUsages: payload.nodeUsages } : {}),
    updatedAt: new Date().toISOString()
  };

  extractorsById.set(extractorId, updated);
  return updated;
}

function deleteExtractor(userId, extractorId) {
  const existing = extractorsById.get(extractorId);

  if (!isOwnedByUser(existing, userId)) {
    return { success: false, reason: 'not_found' };
  }

  if (existing.nodeUsages?.length) {
    return { success: false, reason: 'in_use' };
  }

  extractorsById.delete(extractorId);
  return { success: true };
}

function addExtractorFeedback(userId, extractorId, payload) {
  const existing = extractorsById.get(extractorId);

  if (!isOwnedByUser(existing, userId)) {
    return null;
  }

  const feedback = {
    id: randomUUID(),
    documentId: payload.documentId || null,
    targetType: payload.targetType || null,
    targetPath: payload.targetPath || null,
    feedbackText: payload.feedbackText || '',
    createdAt: new Date().toISOString()
  };

  const updated = {
    ...existing,
    feedbacks: [...existing.feedbacks, feedback],
    updatedAt: new Date().toISOString()
  };

  extractorsById.set(extractorId, updated);
  return feedback;
}

function deleteExtractorFeedback(userId, extractorId, feedbackId) {
  const existing = extractorsById.get(extractorId);

  if (!isOwnedByUser(existing, userId)) {
    return null;
  }

  const feedbacks = existing.feedbacks || [];
  const nextFeedbacks = feedbacks.filter((item) => item.id !== feedbackId);

  if (nextFeedbacks.length === feedbacks.length) {
    return { success: false, reason: 'not_found' };
  }

  const updated = {
    ...existing,
    feedbacks: nextFeedbacks,
    updatedAt: new Date().toISOString()
  };

  extractorsById.set(extractorId, updated);
  return { success: true };
}

function holdDocumentInExtractor(userId, extractorId, payload) {
  const existing = extractorsById.get(extractorId);

  if (!isOwnedByUser(existing, userId)) {
    return null;
  }

  const heldDocument = {
    document: payload.document || null,
    metadata: payload.metadata || {},
    heldAt: new Date().toISOString()
  };

  const updated = {
    ...existing,
    heldDocuments: [...existing.heldDocuments, heldDocument],
    updatedAt: new Date().toISOString()
  };

  extractorsById.set(extractorId, updated);
  return heldDocument;
}

function sendOutFromExtractor(userId, extractorId, documentIds) {
  const existing = extractorsById.get(extractorId);

  if (!isOwnedByUser(existing, userId)) {
    return null;
  }

  const ids = new Set(documentIds || []);
  const releasedDocuments = [];
  const remainingDocuments = [];

  existing.heldDocuments.forEach((heldDocument) => {
    const heldId = heldDocument.document?.id;

    if (heldId && ids.has(heldId)) {
      releasedDocuments.push(heldDocument);
      return;
    }

    remainingDocuments.push(heldDocument);
  });

  const updated = {
    ...existing,
    heldDocuments: remainingDocuments,
    updatedAt: new Date().toISOString()
  };

  extractorsById.set(extractorId, updated);
  return releasedDocuments;
}

function resetConfigServiceStores() {
  splittingPromptsById.clear();
  categorisationPromptsById.clear();
  documentFoldersById.clear();
  extractorsById.clear();
}

module.exports = {
  addExtractorFeedback,
  deleteExtractorFeedback,
  createCategorisationPrompt,
  createDocumentFolder,
  createExtractor,
  createSplittingPrompt,
  deleteCategorisationPrompt,
  deleteDocumentFolder,
  deleteExtractor,
  deleteSplittingPrompt,
  holdDocumentInExtractor,
  holdDocumentInFolder,
  listCategorisationPrompts,
  listDocumentFolders,
  listExtractors,
  listSplittingPrompts,
  resetConfigServiceStores,
  sendOutFromExtractor,
  sendOutFromFolder,
  updateCategorisationPrompt,
  updateDocumentFolder,
  updateExtractor,
  updateSplittingPrompt
};
