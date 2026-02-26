const {
  appendExtractorFeedbackItem,
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
  sendOutFromExtractor,
  sendOutFromFolder,
  updateCategorisationPrompt,
  updateDocumentFolder,
  updateExtractor,
  updateSplittingPrompt
} = require('../services/config-service-nodes.service');
const {
  addTrainingFeedbackWithDocument,
  runExtractorInference
} = require('../services/extractor-inference.service');
const { deleteFeedbackDocument } = require('../services/storage.service');

async function listSplittingPromptsController(req, res, next) {
  try {
    const prompts = await listSplittingPrompts(req.user.id);
    return res.status(200).json({ prompts });
  } catch (error) {
    return next(error);
  }
}

async function createSplittingPromptController(req, res, next) {
  try {
    const prompt = await createSplittingPrompt(req.user.id, req.body || {});
    return res.status(201).json({ prompt });
  } catch (error) {
    return next(error);
  }
}

async function updateSplittingPromptController(req, res, next) {
  try {
    const prompt = await updateSplittingPrompt(req.user.id, req.params.promptId, req.body || {});

    if (!prompt) {
      return res.status(404).json({ error: 'Splitting prompt not found' });
    }

    return res.status(200).json({ prompt });
  } catch (error) {
    return next(error);
  }
}

async function deleteSplittingPromptController(req, res, next) {
  try {
    const result = await deleteSplittingPrompt(req.user.id, req.params.promptId);

    if (result.reason === 'not_found') {
      return res.status(404).json({ error: 'Splitting prompt not found' });
    }

    if (result.reason === 'in_use') {
      return res.status(409).json({ error: 'Splitting prompt is in use' });
    }

    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
}

async function listCategorisationPromptsController(req, res, next) {
  try {
    const prompts = await listCategorisationPrompts(req.user.id);
    return res.status(200).json({ prompts });
  } catch (error) {
    return next(error);
  }
}

async function createCategorisationPromptController(req, res, next) {
  try {
    const result = await createCategorisationPrompt(req.user.id, req.body || {});

    if (result.error) {
      return res.status(400).json({ error: result.error });
    }

    return res.status(201).json({ prompt: result.prompt });
  } catch (error) {
    return next(error);
  }
}

async function updateCategorisationPromptController(req, res, next) {
  try {
    const result = await updateCategorisationPrompt(req.user.id, req.params.promptId, req.body || {});

    if (result.error) {
      return res.status(400).json({ error: result.error });
    }

    if (!result.prompt) {
      return res.status(404).json({ error: 'Categorisation prompt not found' });
    }

    return res.status(200).json({ prompt: result.prompt });
  } catch (error) {
    return next(error);
  }
}

async function deleteCategorisationPromptController(req, res, next) {
  try {
    const result = await deleteCategorisationPrompt(req.user.id, req.params.promptId);

    if (result.reason === 'not_found') {
      return res.status(404).json({ error: 'Categorisation prompt not found' });
    }

    if (result.reason === 'in_use') {
      return res.status(409).json({ error: 'Categorisation prompt is in use' });
    }

    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
}

async function listDocumentFoldersController(req, res, next) {
  try {
    const folders = await listDocumentFolders(req.user.id);
    return res.status(200).json({ folders });
  } catch (error) {
    return next(error);
  }
}

async function createDocumentFolderController(req, res, next) {
  try {
    const folder = await createDocumentFolder(req.user.id, req.body || {});
    return res.status(201).json({ folder });
  } catch (error) {
    return next(error);
  }
}

async function updateDocumentFolderController(req, res, next) {
  try {
    const folder = await updateDocumentFolder(req.user.id, req.params.folderId, req.body || {});

    if (!folder) {
      return res.status(404).json({ error: 'Document folder not found' });
    }

    return res.status(200).json({ folder });
  } catch (error) {
    return next(error);
  }
}

async function deleteDocumentFolderController(req, res, next) {
  try {
    const result = await deleteDocumentFolder(req.user.id, req.params.folderId);

    if (result.reason === 'not_found') {
      return res.status(404).json({ error: 'Document folder not found' });
    }

    if (result.reason === 'in_use') {
      return res.status(409).json({ error: 'Document folder is in use' });
    }

    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
}

async function holdDocumentInFolderController(req, res, next) {
  try {
    const heldDocument = await holdDocumentInFolder(req.user.id, req.params.folderId, req.body || {});

    if (!heldDocument) {
      return res.status(404).json({ error: 'Document folder not found' });
    }

    return res.status(201).json({ heldDocument });
  } catch (error) {
    return next(error);
  }
}

async function sendOutFromFolderController(req, res, next) {
  try {
    const releasedDocuments = await sendOutFromFolder(
      req.user.id,
      req.params.folderId,
      req.body?.documentIds || []
    );

    if (!releasedDocuments) {
      return res.status(404).json({ error: 'Document folder not found' });
    }

    return res.status(200).json({ releasedDocuments });
  } catch (error) {
    return next(error);
  }
}

async function listExtractorsController(req, res, next) {
  try {
    const extractors = await listExtractors(req.user.id);
    return res.status(200).json({ extractors });
  } catch (error) {
    return next(error);
  }
}

async function createExtractorController(req, res, next) {
  try {
    const extractor = await createExtractor(req.user.id, req.body || {});
    return res.status(201).json({ extractor });
  } catch (error) {
    return next(error);
  }
}

async function updateExtractorController(req, res, next) {
  try {
    const extractor = await updateExtractor(req.user.id, req.params.extractorId, req.body || {});

    if (!extractor) {
      return res.status(404).json({ error: 'Extractor not found' });
    }

    return res.status(200).json({ extractor });
  } catch (error) {
    return next(error);
  }
}

async function deleteExtractorController(req, res, next) {
  try {
    const result = await deleteExtractor(req.user.id, req.params.extractorId);

    if (result.reason === 'not_found') {
      return res.status(404).json({ error: 'Extractor not found' });
    }

    if (result.reason === 'in_use') {
      return res.status(409).json({ error: 'Extractor is in use' });
    }

    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
}

async function addExtractorFeedbackController(req, res, next) {
  try {
    let feedbackGroup = null;

    if (req.file) {
      feedbackGroup = await addTrainingFeedbackWithDocument({
        userId: req.user.id,
        extractorId: req.params.extractorId,
        file: req.file,
        targetType: req.body?.targetType || null,
        targetPath: req.body?.targetPath || null,
        feedbackText: req.body?.feedbackText || '',
        documentId: req.body?.documentId || null
      });
    } else {
      const result = await appendExtractorFeedbackItem(
        req.user.id,
        req.params.extractorId,
        req.body?.feedbackGroupId || null,
        req.body || {}
      );

      if (!result) {
        return res.status(404).json({ error: 'Extractor not found' });
      }

      if (!result.success && result.reason === 'group_required') {
        return res.status(400).json({ error: 'Feedback group is required' });
      }

      if (!result.success) {
        return res.status(404).json({ error: 'Feedback group not found' });
      }

      feedbackGroup = result.feedbackGroup;
    }

    if (!feedbackGroup) {
      return res.status(404).json({ error: 'Extractor not found' });
    }

    return res.status(201).json({ feedback: feedbackGroup });
  } catch (error) {
    return next(error);
  }
}

async function deleteExtractorFeedbackController(req, res, next) {
  try {
    const result = await deleteExtractorFeedback(
      req.user.id,
      req.params.extractorId,
      req.params.feedbackId
    );

    if (!result) {
      return res.status(404).json({ error: 'Extractor not found' });
    }

    if (!result.success) {
      return res.status(404).json({ error: 'Feedback not found' });
    }

    if (result.feedback?.storagePath) {
      await deleteFeedbackDocument({
        bucket: result.feedback.storageBucket,
        path: result.feedback.storagePath
      });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    return next(error);
  }
}

async function runExtractorInferenceController(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Document file is required' });
    }

    const result = await runExtractorInference({
      userId: req.user.id,
      extractorId: req.params.extractorId,
      file: req.file
    });

    if (!result) {
      return res.status(404).json({ error: 'Extractor not found' });
    }

    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

async function holdDocumentInExtractorController(req, res, next) {
  try {
    const heldDocument = await holdDocumentInExtractor(
      req.user.id,
      req.params.extractorId,
      req.body || {}
    );

    if (!heldDocument) {
      return res.status(404).json({ error: 'Extractor not found' });
    }

    return res.status(201).json({ heldDocument });
  } catch (error) {
    return next(error);
  }
}

async function sendOutFromExtractorController(req, res, next) {
  try {
    const releasedDocuments = await sendOutFromExtractor(
      req.user.id,
      req.params.extractorId,
      req.body?.documentIds || []
    );

    if (!releasedDocuments) {
      return res.status(404).json({ error: 'Extractor not found' });
    }

    return res.status(200).json({ releasedDocuments });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  addExtractorFeedbackController,
  deleteExtractorFeedbackController,
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
  runExtractorInferenceController,
  updateCategorisationPromptController,
  updateDocumentFolderController,
  updateExtractorController,
  updateSplittingPromptController
};
