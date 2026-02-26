const { randomUUID } = require('crypto');
const { isDatabaseEnabled } = require('../db/postgres');
const {
  deleteEntity,
  getEntity,
  insertEntity,
  listEntities,
  updateEntity
} = require('../db/entity-store');

const splittingPromptsById = new Map();
const categorisationPromptsById = new Map();
const documentFoldersById = new Map();
const extractorsById = new Map();

const TABLES = {
  splittingPrompts: 'splitting_prompts',
  categorisationPrompts: 'categorisation_prompts',
  documentFolders: 'document_folders',
  extractors: 'extractors'
};

function useMemoryStore() {
  return !isDatabaseEnabled();
}

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

function normalizeFeedbackGroups(feedbacks) {
  if (!Array.isArray(feedbacks) || feedbacks.length === 0) {
    return [];
  }

  if (feedbacks[0]?.feedbackItems) {
    return feedbacks.map((group) => ({
      ...group,
      feedbackItems: Array.isArray(group.feedbackItems) ? group.feedbackItems : []
    }));
  }

  return feedbacks.map((item) => {
    const createdAt = item.createdAt || new Date().toISOString();
    return {
      id: item.id || randomUUID(),
      documentId: item.documentId || null,
      document: item.document || null,
      documentSummary: item.documentSummary || null,
      embedding: item.embedding || null,
      storageBucket: item.storageBucket || null,
      storagePath: item.storagePath || null,
      feedbackItems: [
        {
          id: item.id || randomUUID(),
          targetType: item.targetType || null,
          targetPath: item.targetPath || null,
          feedbackText: item.feedbackText || '',
          createdAt
        }
      ],
      createdAt,
      updatedAt: createdAt
    };
  });
}

function withNormalizedFeedbacks(extractor) {
  if (!extractor) {
    return extractor;
  }

  const feedbacks = normalizeFeedbackGroups(extractor.feedbacks || []);
  return { ...extractor, feedbacks };
}

function buildFeedbackItem(payload, now) {
  const createdAt = payload.createdAt || now || new Date().toISOString();
  return {
    id: payload.itemId || payload.id || randomUUID(),
    targetType: payload.targetType || null,
    targetPath: payload.targetPath || null,
    feedbackText: payload.feedbackText || '',
    createdAt
  };
}

function buildFeedbackGroup(payload, now) {
  const createdAt = payload.createdAt || now || new Date().toISOString();
  const groupId = payload.groupId || payload.id || randomUUID();
  return {
    id: groupId,
    documentId: payload.documentId || null,
    document: payload.document || null,
    documentSummary: payload.documentSummary || null,
    embedding: payload.embedding || null,
    storageBucket: payload.storageBucket || null,
    storagePath: payload.storagePath || null,
    feedbackItems: [buildFeedbackItem(payload, createdAt)],
    createdAt,
    updatedAt: createdAt
  };
}

function countFeedbackItems(groups) {
  return groups.reduce((total, group) => total + (group.feedbackItems || []).length, 0);
}

async function createSplittingPrompt(userId, payload) {
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

  if (useMemoryStore()) {
    splittingPromptsById.set(prompt.id, prompt);
    return prompt;
  }

  return insertEntity(TABLES.splittingPrompts, {
    id: prompt.id,
    userId,
    data: {
      name: prompt.name,
      instructions: prompt.instructions,
      instructionsPreview: prompt.instructionsPreview,
      nodeUsages: prompt.nodeUsages
    },
    createdAt: now,
    updatedAt: now
  });
}

async function listSplittingPrompts(userId) {
  if (useMemoryStore()) {
    return listByOwner(splittingPromptsById, userId);
  }

  return listEntities(TABLES.splittingPrompts, userId);
}

async function updateSplittingPrompt(userId, promptId, payload) {
  if (useMemoryStore()) {
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

  const existing = await getEntity(TABLES.splittingPrompts, userId, promptId);

  if (!existing) {
    return null;
  }

  const nextName = payload.name !== undefined ? payload.name.trim() || existing.name : existing.name;
  const nextInstructions =
    payload.instructions !== undefined ? payload.instructions : existing.instructions || '';
  const nextPreview =
    payload.instructions !== undefined
      ? toPreview(payload.instructions)
      : existing.instructionsPreview || toPreview(existing.instructions || '');
  const nextNodeUsages = Array.isArray(payload.nodeUsages)
    ? payload.nodeUsages
    : existing.nodeUsages || [];

  return updateEntity(
    TABLES.splittingPrompts,
    userId,
    promptId,
    {
      name: nextName,
      instructions: nextInstructions,
      instructionsPreview: nextPreview,
      nodeUsages: nextNodeUsages
    },
    new Date().toISOString()
  );
}

async function deleteSplittingPrompt(userId, promptId) {
  if (useMemoryStore()) {
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

  const existing = await getEntity(TABLES.splittingPrompts, userId, promptId);

  if (!existing) {
    return { success: false, reason: 'not_found' };
  }

  if (existing.nodeUsages?.length) {
    return { success: false, reason: 'in_use' };
  }

  await deleteEntity(TABLES.splittingPrompts, userId, promptId);
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

async function createCategorisationPrompt(userId, payload) {
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

  if (useMemoryStore()) {
    categorisationPromptsById.set(prompt.id, prompt);
    return { prompt };
  }

  const saved = await insertEntity(TABLES.categorisationPrompts, {
    id: prompt.id,
    userId,
    data: {
      name: prompt.name,
      labels: prompt.labels,
      nodeUsages: prompt.nodeUsages
    },
    createdAt: now,
    updatedAt: now
  });

  return { prompt: saved };
}

async function listCategorisationPrompts(userId) {
  if (useMemoryStore()) {
    return listByOwner(categorisationPromptsById, userId);
  }

  return listEntities(TABLES.categorisationPrompts, userId);
}

async function updateCategorisationPrompt(userId, promptId, payload) {
  if (useMemoryStore()) {
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

  const existing = await getEntity(TABLES.categorisationPrompts, userId, promptId);

  if (!existing) {
    return { prompt: null };
  }

  const validationError = validateCategorisationLabels(payload.labels || existing.labels || []);

  if (validationError) {
    return { error: validationError };
  }

  const nextName = payload.name !== undefined ? payload.name.trim() || existing.name : existing.name;
  const nextLabels = payload.labels !== undefined ? payload.labels : existing.labels || [];
  const nextNodeUsages = Array.isArray(payload.nodeUsages)
    ? payload.nodeUsages
    : existing.nodeUsages || [];

  const updated = await updateEntity(
    TABLES.categorisationPrompts,
    userId,
    promptId,
    {
      name: nextName,
      labels: nextLabels,
      nodeUsages: nextNodeUsages
    },
    new Date().toISOString()
  );

  return { prompt: updated };
}

async function deleteCategorisationPrompt(userId, promptId) {
  if (useMemoryStore()) {
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

  const existing = await getEntity(TABLES.categorisationPrompts, userId, promptId);

  if (!existing) {
    return { success: false, reason: 'not_found' };
  }

  if (existing.nodeUsages?.length) {
    return { success: false, reason: 'in_use' };
  }

  await deleteEntity(TABLES.categorisationPrompts, userId, promptId);
  return { success: true };
}

async function createDocumentFolder(userId, payload) {
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

  if (useMemoryStore()) {
    documentFoldersById.set(folder.id, folder);
    return folder;
  }

  return insertEntity(TABLES.documentFolders, {
    id: folder.id,
    userId,
    data: {
      name: folder.name,
      heldDocuments: folder.heldDocuments,
      nodeUsages: folder.nodeUsages
    },
    createdAt: now,
    updatedAt: now
  });
}

async function listDocumentFolders(userId) {
  const folders = useMemoryStore()
    ? listByOwner(documentFoldersById, userId)
    : await listEntities(TABLES.documentFolders, userId);

  return folders.map((folder) => ({
    ...folder,
    heldDocumentCount: (folder.heldDocuments || []).length
  }));
}

async function updateDocumentFolder(userId, folderId, payload) {
  if (useMemoryStore()) {
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

  const existing = await getEntity(TABLES.documentFolders, userId, folderId);

  if (!existing) {
    return null;
  }

  const nextName = payload.name !== undefined ? payload.name.trim() || existing.name : existing.name;
  const nextNodeUsages = Array.isArray(payload.nodeUsages)
    ? payload.nodeUsages
    : existing.nodeUsages || [];

  return updateEntity(
    TABLES.documentFolders,
    userId,
    folderId,
    {
      name: nextName,
      heldDocuments: existing.heldDocuments || [],
      nodeUsages: nextNodeUsages
    },
    new Date().toISOString()
  );
}

async function deleteDocumentFolder(userId, folderId) {
  if (useMemoryStore()) {
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

  const existing = await getEntity(TABLES.documentFolders, userId, folderId);

  if (!existing) {
    return { success: false, reason: 'not_found' };
  }

  if (existing.nodeUsages?.length) {
    return { success: false, reason: 'in_use' };
  }

  await deleteEntity(TABLES.documentFolders, userId, folderId);
  return { success: true };
}

async function holdDocumentInFolder(userId, folderId, payload) {
  if (useMemoryStore()) {
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

  const existing = await getEntity(TABLES.documentFolders, userId, folderId);

  if (!existing) {
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

  const nextHeld = [...(existing.heldDocuments || []), heldRecord];

  await updateEntity(
    TABLES.documentFolders,
    userId,
    folderId,
    {
      name: existing.name,
      heldDocuments: nextHeld,
      nodeUsages: existing.nodeUsages || []
    },
    new Date().toISOString()
  );

  return heldRecord;
}

async function sendOutFromFolder(userId, folderId, documentIds) {
  if (useMemoryStore()) {
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

  const existing = await getEntity(TABLES.documentFolders, userId, folderId);

  if (!existing) {
    return null;
  }

  const ids = new Set(documentIds || []);
  const releasedDocuments = [];
  const remainingDocuments = [];

  (existing.heldDocuments || []).forEach((heldDocument) => {
    const heldId = heldDocument.document?.id;

    if (heldId && ids.has(heldId)) {
      releasedDocuments.push(heldDocument);
      return;
    }

    remainingDocuments.push(heldDocument);
  });

  await updateEntity(
    TABLES.documentFolders,
    userId,
    folderId,
    {
      name: existing.name,
      heldDocuments: remainingDocuments,
      nodeUsages: existing.nodeUsages || []
    },
    new Date().toISOString()
  );

  return releasedDocuments;
}

async function createExtractor(userId, payload) {
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

  if (useMemoryStore()) {
    extractorsById.set(extractor.id, extractor);
    return extractor;
  }

  return insertEntity(TABLES.extractors, {
    id: extractor.id,
    userId,
    data: {
      name: extractor.name,
      schema: extractor.schema,
      holdAllDocuments: extractor.holdAllDocuments,
      heldDocuments: extractor.heldDocuments,
      feedbacks: extractor.feedbacks,
      nodeUsages: extractor.nodeUsages
    },
    createdAt: now,
    updatedAt: now
  });
}

async function listExtractors(userId) {
  const extractors = useMemoryStore()
    ? listByOwner(extractorsById, userId)
    : await listEntities(TABLES.extractors, userId);

  return extractors.map((extractor) => {
    const normalized = withNormalizedFeedbacks(extractor);
    return {
      ...normalized,
      heldDocumentCount: (normalized.heldDocuments || []).length,
      feedbackCount: countFeedbackItems(normalized.feedbacks || [])
    };
  });
}

async function getExtractorById(userId, extractorId) {
  if (useMemoryStore()) {
    const existing = extractorsById.get(extractorId);
    if (!isOwnedByUser(existing, userId)) {
      return null;
    }
    return withNormalizedFeedbacks(existing);
  }

  const extractor = await getEntity(TABLES.extractors, userId, extractorId);
  return withNormalizedFeedbacks(extractor);
}

async function updateExtractor(userId, extractorId, payload) {
  if (useMemoryStore()) {
    const existing = withNormalizedFeedbacks(extractorsById.get(extractorId));

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

  const existing = withNormalizedFeedbacks(await getEntity(TABLES.extractors, userId, extractorId));

  if (!existing) {
    return null;
  }

  const nextName = payload.name !== undefined ? payload.name.trim() || existing.name : existing.name;
  const nextSchema = payload.schema !== undefined ? payload.schema : existing.schema;
  const nextHold =
    payload.holdAllDocuments !== undefined
      ? Boolean(payload.holdAllDocuments)
      : existing.holdAllDocuments;
  const nextNodeUsages = Array.isArray(payload.nodeUsages)
    ? payload.nodeUsages
    : existing.nodeUsages || [];

  return updateEntity(
    TABLES.extractors,
    userId,
    extractorId,
    {
      name: nextName,
      schema: nextSchema,
      holdAllDocuments: nextHold,
      heldDocuments: existing.heldDocuments || [],
      feedbacks: normalizeFeedbackGroups(existing.feedbacks || []),
      nodeUsages: nextNodeUsages
    },
    new Date().toISOString()
  );
}

async function deleteExtractor(userId, extractorId) {
  if (useMemoryStore()) {
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

  const existing = await getEntity(TABLES.extractors, userId, extractorId);

  if (!existing) {
    return { success: false, reason: 'not_found' };
  }

  if (existing.nodeUsages?.length) {
    return { success: false, reason: 'in_use' };
  }

  await deleteEntity(TABLES.extractors, userId, extractorId);
  return { success: true };
}

async function createExtractorFeedbackGroup(userId, extractorId, payload) {
  const now = new Date().toISOString();

  if (useMemoryStore()) {
    const existing = withNormalizedFeedbacks(extractorsById.get(extractorId));

    if (!isOwnedByUser(existing, userId)) {
      return null;
    }

    const feedbackGroup = buildFeedbackGroup(payload, now);
    const updated = {
      ...existing,
      feedbacks: [...(existing.feedbacks || []), feedbackGroup],
      updatedAt: now
    };

    extractorsById.set(extractorId, updated);
    return feedbackGroup;
  }

  const existing = withNormalizedFeedbacks(await getEntity(TABLES.extractors, userId, extractorId));

  if (!existing) {
    return null;
  }

  const feedbackGroup = buildFeedbackGroup(payload, now);

  await updateEntity(
    TABLES.extractors,
    userId,
    extractorId,
    {
      name: existing.name,
      schema: existing.schema,
      holdAllDocuments: existing.holdAllDocuments,
      heldDocuments: existing.heldDocuments || [],
      feedbacks: [...(existing.feedbacks || []), feedbackGroup],
      nodeUsages: existing.nodeUsages || []
    },
    now
  );

  return feedbackGroup;
}

async function appendExtractorFeedbackItem(userId, extractorId, feedbackGroupId, payload) {
  if (!feedbackGroupId) {
    return { success: false, reason: 'group_required' };
  }

  const now = new Date().toISOString();

  if (useMemoryStore()) {
    const existing = withNormalizedFeedbacks(extractorsById.get(extractorId));

    if (!isOwnedByUser(existing, userId)) {
      return null;
    }

    const feedbacks = existing.feedbacks || [];
    const index = feedbacks.findIndex((group) => group.id === feedbackGroupId);

    if (index < 0) {
      return { success: false, reason: 'not_found' };
    }

    const group = feedbacks[index];
    const nextItem = buildFeedbackItem(payload, now);
    const updatedGroup = {
      ...group,
      feedbackItems: [...(group.feedbackItems || []), nextItem],
      updatedAt: now
    };
    const nextFeedbacks = [...feedbacks];
    nextFeedbacks[index] = updatedGroup;

    const updated = {
      ...existing,
      feedbacks: nextFeedbacks,
      updatedAt: now
    };

    extractorsById.set(extractorId, updated);
    return { success: true, feedbackGroup: updatedGroup };
  }

  const existing = withNormalizedFeedbacks(await getEntity(TABLES.extractors, userId, extractorId));

  if (!existing) {
    return null;
  }

  const feedbacks = existing.feedbacks || [];
  const index = feedbacks.findIndex((group) => group.id === feedbackGroupId);

  if (index < 0) {
    return { success: false, reason: 'not_found' };
  }

  const group = feedbacks[index];
  const nextItem = buildFeedbackItem(payload, now);
  const updatedGroup = {
    ...group,
    feedbackItems: [...(group.feedbackItems || []), nextItem],
    updatedAt: now
  };
  const nextFeedbacks = [...feedbacks];
  nextFeedbacks[index] = updatedGroup;

  await updateEntity(
    TABLES.extractors,
    userId,
    extractorId,
    {
      name: existing.name,
      schema: existing.schema,
      holdAllDocuments: existing.holdAllDocuments,
      heldDocuments: existing.heldDocuments || [],
      feedbacks: nextFeedbacks,
      nodeUsages: existing.nodeUsages || []
    },
    now
  );

  return { success: true, feedbackGroup: updatedGroup };
}

async function deleteExtractorFeedback(userId, extractorId, feedbackGroupId) {
  if (useMemoryStore()) {
    const existing = withNormalizedFeedbacks(extractorsById.get(extractorId));

    if (!isOwnedByUser(existing, userId)) {
      return null;
    }

    const feedbacks = existing.feedbacks || [];
    const removedFeedback = feedbacks.find((item) => item.id === feedbackGroupId) || null;
    const nextFeedbacks = feedbacks.filter((item) => item.id !== feedbackGroupId);

    if (nextFeedbacks.length === feedbacks.length) {
      return { success: false, reason: 'not_found' };
    }

    const updated = {
      ...existing,
      feedbacks: nextFeedbacks,
      updatedAt: new Date().toISOString()
    };

    extractorsById.set(extractorId, updated);
    return { success: true, feedback: removedFeedback };
  }

  const existing = withNormalizedFeedbacks(await getEntity(TABLES.extractors, userId, extractorId));

  if (!existing) {
    return null;
  }

  const feedbacks = existing.feedbacks || [];
  const removedFeedback = feedbacks.find((item) => item.id === feedbackGroupId) || null;
  const nextFeedbacks = feedbacks.filter((item) => item.id !== feedbackGroupId);

  if (nextFeedbacks.length === feedbacks.length) {
    return { success: false, reason: 'not_found' };
  }

  await updateEntity(
    TABLES.extractors,
    userId,
    extractorId,
    {
      name: existing.name,
      schema: existing.schema,
      holdAllDocuments: existing.holdAllDocuments,
      heldDocuments: existing.heldDocuments || [],
      feedbacks: nextFeedbacks,
      nodeUsages: existing.nodeUsages || []
    },
    new Date().toISOString()
  );

  return { success: true, feedback: removedFeedback };
}

async function holdDocumentInExtractor(userId, extractorId, payload) {
  if (useMemoryStore()) {
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

  const existing = await getEntity(TABLES.extractors, userId, extractorId);

  if (!existing) {
    return null;
  }

  const heldDocument = {
    document: payload.document || null,
    metadata: payload.metadata || {},
    heldAt: new Date().toISOString()
  };

  await updateEntity(
    TABLES.extractors,
    userId,
    extractorId,
    {
      name: existing.name,
      schema: existing.schema,
      holdAllDocuments: existing.holdAllDocuments,
      heldDocuments: [...(existing.heldDocuments || []), heldDocument],
      feedbacks: normalizeFeedbackGroups(existing.feedbacks || []),
      nodeUsages: existing.nodeUsages || []
    },
    new Date().toISOString()
  );

  return heldDocument;
}

async function sendOutFromExtractor(userId, extractorId, documentIds) {
  if (useMemoryStore()) {
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

  const existing = await getEntity(TABLES.extractors, userId, extractorId);

  if (!existing) {
    return null;
  }

  const ids = new Set(documentIds || []);
  const releasedDocuments = [];
  const remainingDocuments = [];

  (existing.heldDocuments || []).forEach((heldDocument) => {
    const heldId = heldDocument.document?.id;

    if (heldId && ids.has(heldId)) {
      releasedDocuments.push(heldDocument);
      return;
    }

    remainingDocuments.push(heldDocument);
  });

  await updateEntity(
    TABLES.extractors,
    userId,
    extractorId,
    {
      name: existing.name,
      schema: existing.schema,
      holdAllDocuments: existing.holdAllDocuments,
      heldDocuments: remainingDocuments,
      feedbacks: normalizeFeedbackGroups(existing.feedbacks || []),
      nodeUsages: existing.nodeUsages || []
    },
    new Date().toISOString()
  );

  return releasedDocuments;
}

function resetConfigServiceStores() {
  splittingPromptsById.clear();
  categorisationPromptsById.clear();
  documentFoldersById.clear();
  extractorsById.clear();
}

module.exports = {
  appendExtractorFeedbackItem,
  createExtractorFeedbackGroup,
  deleteExtractorFeedback,
  createCategorisationPrompt,
  createDocumentFolder,
  createExtractor,
  createSplittingPrompt,
  deleteCategorisationPrompt,
  deleteDocumentFolder,
  deleteExtractor,
  getExtractorById,
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
