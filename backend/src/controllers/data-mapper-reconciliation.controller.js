const {
  createDataMapRule,
  createDataMapSet,
  createMatchingSet,
  createReconciliationRule,
  deleteDataMapRule,
  deleteDataMapSet,
  deleteReconciliationRule,
  listDataMapRules,
  listDataMapSets,
  listMatchingSets,
  listReconciliationRules,
  updateDataMapRule,
  updateDataMapSet,
  updateMatchingSetStatus,
  updateReconciliationRule
} = require('../services/data-mapper-reconciliation.service');

function listDataMapSetsController(req, res) {
  const sets = listDataMapSets(req.user.id);
  return res.status(200).json({ sets });
}

function createDataMapSetController(req, res) {
  const set = createDataMapSet(req.user.id, req.body || {});
  return res.status(201).json({ set });
}

function updateDataMapSetController(req, res) {
  const set = updateDataMapSet(req.user.id, req.params.setId, req.body || {});

  if (!set) {
    return res.status(404).json({ error: 'Data map set not found' });
  }

  return res.status(200).json({ set });
}

function deleteDataMapSetController(req, res) {
  const result = deleteDataMapSet(req.user.id, req.params.setId);

  if (result.reason === 'not_found') {
    return res.status(404).json({ error: 'Data map set not found' });
  }

  if (result.reason === 'in_use') {
    return res.status(409).json({ error: 'Data map set is in use by a data map rule' });
  }

  return res.status(204).send();
}

function listDataMapRulesController(req, res) {
  const rules = listDataMapRules(req.user.id);
  return res.status(200).json({ rules });
}

function createDataMapRuleController(req, res) {
  const rule = createDataMapRule(req.user.id, req.body || {});
  return res.status(201).json({ rule });
}

function updateDataMapRuleController(req, res) {
  const rule = updateDataMapRule(req.user.id, req.params.ruleId, req.body || {});

  if (!rule) {
    return res.status(404).json({ error: 'Data map rule not found' });
  }

  return res.status(200).json({ rule });
}

function deleteDataMapRuleController(req, res) {
  const result = deleteDataMapRule(req.user.id, req.params.ruleId);

  if (result.reason === 'not_found') {
    return res.status(404).json({ error: 'Data map rule not found' });
  }

  if (result.reason === 'in_use') {
    return res.status(409).json({ error: 'Data map rule is in use' });
  }

  return res.status(204).send();
}

function listReconciliationRulesController(req, res) {
  const rules = listReconciliationRules(req.user.id);
  return res.status(200).json({ rules });
}

function createReconciliationRuleController(req, res) {
  const rule = createReconciliationRule(req.user.id, req.body || {});
  return res.status(201).json({ rule });
}

function updateReconciliationRuleController(req, res) {
  const rule = updateReconciliationRule(req.user.id, req.params.ruleId, req.body || {});

  if (!rule) {
    return res.status(404).json({ error: 'Reconciliation rule not found' });
  }

  return res.status(200).json({ rule });
}

function deleteReconciliationRuleController(req, res) {
  const result = deleteReconciliationRule(req.user.id, req.params.ruleId);

  if (result.reason === 'not_found') {
    return res.status(404).json({ error: 'Reconciliation rule not found' });
  }

  if (result.reason === 'in_use') {
    return res.status(409).json({ error: 'Reconciliation rule is in use' });
  }

  return res.status(204).send();
}

function listMatchingSetsController(req, res) {
  const matchingSets = listMatchingSets(req.user.id, req.params.ruleId);

  if (!matchingSets) {
    return res.status(404).json({ error: 'Reconciliation rule not found' });
  }

  return res.status(200).json({ matchingSets });
}

function createMatchingSetController(req, res) {
  const matchingSet = createMatchingSet(req.user.id, req.params.ruleId, req.body || {});

  if (!matchingSet) {
    return res.status(404).json({ error: 'Reconciliation rule not found' });
  }

  return res.status(201).json({ matchingSet });
}

function forceReconcileMatchingSetController(req, res) {
  const matchingSet = updateMatchingSetStatus(
    req.user.id,
    req.params.ruleId,
    req.params.matchingSetId,
    'force_reconciled'
  );

  if (!matchingSet) {
    return res.status(404).json({ error: 'Matching set not found' });
  }

  return res.status(200).json({ matchingSet });
}

function rejectMatchingSetController(req, res) {
  const matchingSet = updateMatchingSetStatus(
    req.user.id,
    req.params.ruleId,
    req.params.matchingSetId,
    'rejected'
  );

  if (!matchingSet) {
    return res.status(404).json({ error: 'Matching set not found' });
  }

  return res.status(200).json({ matchingSet });
}

module.exports = {
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
};
