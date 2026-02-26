const express = require('express');
const { requireAuth } = require('../middleware/require-auth.middleware');
const {
  createDataMapRuleController,
  createDataMapSetController,
  createMatchingSetController,
  createReconciliationRuleController,
  deleteDataMapRuleController,
  deleteDataMapSetController,
  deleteReconciliationRuleController,
  forceReconcileMatchingSetController,
  listDataMapRulesController,
  listDataMapSetsController,
  listMatchingSetsController,
  listReconciliationRulesController,
  rejectMatchingSetController,
  updateDataMapRuleController,
  updateDataMapSetController,
  updateReconciliationRuleController
} = require('../controllers/data-mapper-reconciliation.controller');

const router = express.Router();
router.get('/data-map-sets', requireAuth, listDataMapSetsController);
router.post('/data-map-sets', requireAuth, createDataMapSetController);
router.patch('/data-map-sets/:setId', requireAuth, updateDataMapSetController);
router.delete('/data-map-sets/:setId', requireAuth, deleteDataMapSetController);

router.get('/data-map-rules', requireAuth, listDataMapRulesController);
router.post('/data-map-rules', requireAuth, createDataMapRuleController);
router.patch('/data-map-rules/:ruleId', requireAuth, updateDataMapRuleController);
router.delete('/data-map-rules/:ruleId', requireAuth, deleteDataMapRuleController);

router.get('/reconciliation-rules', requireAuth, listReconciliationRulesController);
router.post('/reconciliation-rules', requireAuth, createReconciliationRuleController);
router.patch('/reconciliation-rules/:ruleId', requireAuth, updateReconciliationRuleController);
router.delete('/reconciliation-rules/:ruleId', requireAuth, deleteReconciliationRuleController);

router.get('/reconciliation-rules/:ruleId/matching-sets', requireAuth, listMatchingSetsController);
router.post('/reconciliation-rules/:ruleId/matching-sets', requireAuth, createMatchingSetController);
router.post(
  '/reconciliation-rules/:ruleId/matching-sets/:matchingSetId/force-reconcile',
  requireAuth,
  forceReconcileMatchingSetController
);
router.post(
  '/reconciliation-rules/:ruleId/matching-sets/:matchingSetId/reject',
  requireAuth,
  rejectMatchingSetController
);

module.exports = router;
