const express = require('express');
const { requireAuth } = require('../middleware/require-auth.middleware');
const { upload } = require('../middleware/upload.middleware');
const {
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
  runExtractorInferenceController,
  sendOutFromExtractorController,
  sendOutFromFolderController,
  updateCategorisationPromptController,
  updateDocumentFolderController,
  updateExtractorController,
  updateSplittingPromptController
} = require('../controllers/config-service-nodes.controller');

const router = express.Router();
router.get('/splitting-prompts', requireAuth, listSplittingPromptsController);
router.post('/splitting-prompts', requireAuth, createSplittingPromptController);
router.patch('/splitting-prompts/:promptId', requireAuth, updateSplittingPromptController);
router.delete('/splitting-prompts/:promptId', requireAuth, deleteSplittingPromptController);

router.get('/categorisation-prompts', requireAuth, listCategorisationPromptsController);
router.post('/categorisation-prompts', requireAuth, createCategorisationPromptController);
router.patch('/categorisation-prompts/:promptId', requireAuth, updateCategorisationPromptController);
router.delete('/categorisation-prompts/:promptId', requireAuth, deleteCategorisationPromptController);

router.get('/document-folders', requireAuth, listDocumentFoldersController);
router.post('/document-folders', requireAuth, createDocumentFolderController);
router.patch('/document-folders/:folderId', requireAuth, updateDocumentFolderController);
router.delete('/document-folders/:folderId', requireAuth, deleteDocumentFolderController);
router.post(
  '/document-folders/:folderId/held-documents',
  requireAuth,
  holdDocumentInFolderController
);
router.post('/document-folders/:folderId/send-out', requireAuth, sendOutFromFolderController);

router.get('/extractors', requireAuth, listExtractorsController);
router.post('/extractors', requireAuth, createExtractorController);
router.patch('/extractors/:extractorId', requireAuth, updateExtractorController);
router.delete('/extractors/:extractorId', requireAuth, deleteExtractorController);
router.post(
  '/extractors/:extractorId/feedbacks',
  requireAuth,
  upload.single('file'),
  addExtractorFeedbackController
);
router.delete(
  '/extractors/:extractorId/feedbacks/:feedbackId',
  requireAuth,
  deleteExtractorFeedbackController
);
router.post(
  '/extractors/:extractorId/extractions',
  requireAuth,
  upload.single('file'),
  runExtractorInferenceController
);
router.post(
  '/extractors/:extractorId/held-documents',
  requireAuth,
  holdDocumentInExtractorController
);
router.post('/extractors/:extractorId/send-out', requireAuth, sendOutFromExtractorController);

module.exports = router;
