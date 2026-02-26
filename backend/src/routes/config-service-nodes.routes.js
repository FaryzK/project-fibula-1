const express = require('express');
const { requireAuth } = require('../middleware/require-auth.middleware');
const {
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
} = require('../controllers/config-service-nodes.controller');

const router = express.Router();

router.use(requireAuth);

router.get('/splitting-prompts', listSplittingPromptsController);
router.post('/splitting-prompts', createSplittingPromptController);
router.patch('/splitting-prompts/:promptId', updateSplittingPromptController);
router.delete('/splitting-prompts/:promptId', deleteSplittingPromptController);

router.get('/categorisation-prompts', listCategorisationPromptsController);
router.post('/categorisation-prompts', createCategorisationPromptController);
router.patch('/categorisation-prompts/:promptId', updateCategorisationPromptController);
router.delete('/categorisation-prompts/:promptId', deleteCategorisationPromptController);

router.get('/document-folders', listDocumentFoldersController);
router.post('/document-folders', createDocumentFolderController);
router.patch('/document-folders/:folderId', updateDocumentFolderController);
router.delete('/document-folders/:folderId', deleteDocumentFolderController);
router.post('/document-folders/:folderId/held-documents', holdDocumentInFolderController);
router.post('/document-folders/:folderId/send-out', sendOutFromFolderController);

router.get('/extractors', listExtractorsController);
router.post('/extractors', createExtractorController);
router.patch('/extractors/:extractorId', updateExtractorController);
router.delete('/extractors/:extractorId', deleteExtractorController);
router.post('/extractors/:extractorId/feedbacks', addExtractorFeedbackController);
router.post('/extractors/:extractorId/held-documents', holdDocumentInExtractorController);
router.post('/extractors/:extractorId/send-out', sendOutFromExtractorController);

module.exports = router;
