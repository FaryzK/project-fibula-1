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

router.use(requireAuth);

router.get('/data-map-sets', listDataMapSetsController);
router.post('/data-map-sets', createDataMapSetController);
router.patch('/data-map-sets/:setId', updateDataMapSetController);
router.delete('/data-map-sets/:setId', deleteDataMapSetController);

router.get('/data-map-rules', listDataMapRulesController);
router.post('/data-map-rules', createDataMapRuleController);
router.patch('/data-map-rules/:ruleId', updateDataMapRuleController);
router.delete('/data-map-rules/:ruleId', deleteDataMapRuleController);

router.get('/reconciliation-rules', listReconciliationRulesController);
router.post('/reconciliation-rules', createReconciliationRuleController);
router.patch('/reconciliation-rules/:ruleId', updateReconciliationRuleController);
router.delete('/reconciliation-rules/:ruleId', deleteReconciliationRuleController);

router.get('/reconciliation-rules/:ruleId/matching-sets', listMatchingSetsController);
router.post('/reconciliation-rules/:ruleId/matching-sets', createMatchingSetController);
router.post(
  '/reconciliation-rules/:ruleId/matching-sets/:matchingSetId/force-reconcile',
  forceReconcileMatchingSetController
);
router.post(
  '/reconciliation-rules/:ruleId/matching-sets/:matchingSetId/reject',
  rejectMatchingSetController
);

module.exports = router;
