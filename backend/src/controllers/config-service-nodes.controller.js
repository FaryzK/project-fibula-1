const {
  addExtractorFeedback,
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
  sendOutFromExtractor,
  sendOutFromFolder,
  updateCategorisationPrompt,
  updateDocumentFolder,
  updateExtractor,
  updateSplittingPrompt
} = require('../services/config-service-nodes.service');

function listSplittingPromptsController(req, res) {
  const prompts = listSplittingPrompts(req.user.id);
  return res.status(200).json({ prompts });
}

function createSplittingPromptController(req, res) {
  const prompt = createSplittingPrompt(req.user.id, req.body || {});
  return res.status(201).json({ prompt });
}

function updateSplittingPromptController(req, res) {
  const prompt = updateSplittingPrompt(req.user.id, req.params.promptId, req.body || {});

  if (!prompt) {
    return res.status(404).json({ error: 'Splitting prompt not found' });
  }

  return res.status(200).json({ prompt });
}

function deleteSplittingPromptController(req, res) {
  const result = deleteSplittingPrompt(req.user.id, req.params.promptId);

  if (result.reason === 'not_found') {
    return res.status(404).json({ error: 'Splitting prompt not found' });
  }

  if (result.reason === 'in_use') {
    return res.status(409).json({ error: 'Splitting prompt is in use' });
  }

  return res.status(204).send();
}

function listCategorisationPromptsController(req, res) {
  const prompts = listCategorisationPrompts(req.user.id);
  return res.status(200).json({ prompts });
}

function createCategorisationPromptController(req, res) {
  const result = createCategorisationPrompt(req.user.id, req.body || {});

  if (result.error) {
    return res.status(400).json({ error: result.error });
  }

  return res.status(201).json({ prompt: result.prompt });
}

function updateCategorisationPromptController(req, res) {
  const result = updateCategorisationPrompt(req.user.id, req.params.promptId, req.body || {});

  if (result.error) {
    return res.status(400).json({ error: result.error });
  }

  if (!result.prompt) {
    return res.status(404).json({ error: 'Categorisation prompt not found' });
  }

  return res.status(200).json({ prompt: result.prompt });
}

function deleteCategorisationPromptController(req, res) {
  const result = deleteCategorisationPrompt(req.user.id, req.params.promptId);

  if (result.reason === 'not_found') {
    return res.status(404).json({ error: 'Categorisation prompt not found' });
  }

  if (result.reason === 'in_use') {
    return res.status(409).json({ error: 'Categorisation prompt is in use' });
  }

  return res.status(204).send();
}

function listDocumentFoldersController(req, res) {
  const folders = listDocumentFolders(req.user.id);
  return res.status(200).json({ folders });
}

function createDocumentFolderController(req, res) {
  const folder = createDocumentFolder(req.user.id, req.body || {});
  return res.status(201).json({ folder });
}

function updateDocumentFolderController(req, res) {
  const folder = updateDocumentFolder(req.user.id, req.params.folderId, req.body || {});

  if (!folder) {
    return res.status(404).json({ error: 'Document folder not found' });
  }

  return res.status(200).json({ folder });
}

function deleteDocumentFolderController(req, res) {
  const result = deleteDocumentFolder(req.user.id, req.params.folderId);

  if (result.reason === 'not_found') {
    return res.status(404).json({ error: 'Document folder not found' });
  }

  if (result.reason === 'in_use') {
    return res.status(409).json({ error: 'Document folder is in use' });
  }

  return res.status(204).send();
}

function holdDocumentInFolderController(req, res) {
  const heldDocument = holdDocumentInFolder(req.user.id, req.params.folderId, req.body || {});

  if (!heldDocument) {
    return res.status(404).json({ error: 'Document folder not found' });
  }

  return res.status(201).json({ heldDocument });
}

function sendOutFromFolderController(req, res) {
  const releasedDocuments = sendOutFromFolder(
    req.user.id,
    req.params.folderId,
    req.body?.documentIds || []
  );

  if (!releasedDocuments) {
    return res.status(404).json({ error: 'Document folder not found' });
  }

  return res.status(200).json({ releasedDocuments });
}

function listExtractorsController(req, res) {
  const extractors = listExtractors(req.user.id);
  return res.status(200).json({ extractors });
}

function createExtractorController(req, res) {
  const extractor = createExtractor(req.user.id, req.body || {});
  return res.status(201).json({ extractor });
}

function updateExtractorController(req, res) {
  const extractor = updateExtractor(req.user.id, req.params.extractorId, req.body || {});

  if (!extractor) {
    return res.status(404).json({ error: 'Extractor not found' });
  }

  return res.status(200).json({ extractor });
}

function deleteExtractorController(req, res) {
  const result = deleteExtractor(req.user.id, req.params.extractorId);

  if (result.reason === 'not_found') {
    return res.status(404).json({ error: 'Extractor not found' });
  }

  if (result.reason === 'in_use') {
    return res.status(409).json({ error: 'Extractor is in use' });
  }

  return res.status(204).send();
}

function addExtractorFeedbackController(req, res) {
  const feedback = addExtractorFeedback(req.user.id, req.params.extractorId, req.body || {});

  if (!feedback) {
    return res.status(404).json({ error: 'Extractor not found' });
  }

  return res.status(201).json({ feedback });
}

function holdDocumentInExtractorController(req, res) {
  const heldDocument = holdDocumentInExtractor(req.user.id, req.params.extractorId, req.body || {});

  if (!heldDocument) {
    return res.status(404).json({ error: 'Extractor not found' });
  }

  return res.status(201).json({ heldDocument });
}

function sendOutFromExtractorController(req, res) {
  const releasedDocuments = sendOutFromExtractor(
    req.user.id,
    req.params.extractorId,
    req.body?.documentIds || []
  );

  if (!releasedDocuments) {
    return res.status(404).json({ error: 'Extractor not found' });
  }

  return res.status(200).json({ releasedDocuments });
}

module.exports = {
  addExtractorFeedbackController,
  createCategorisationPromptController,
  createDocumentFolderController,
  createExtractorController,
  createSplittingPromptController,
  deleteCategorisationPromptController,
  deleteDocumentFolderController,
  deleteExtractorController,
  deleteSplittingPromptController,
  holdDocumentInExtractorController,
  holdDocumentInFolderController,
  listCategorisationPromptsController,
  listDocumentFoldersController,
  listExtractorsController,
  listSplittingPromptsController,
  sendOutFromExtractorController,
  sendOutFromFolderController,
  updateCategorisationPromptController,
  updateDocumentFolderController,
  updateExtractorController,
  updateSplittingPromptController
};
