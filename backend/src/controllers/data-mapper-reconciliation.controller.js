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

async function listDataMapSetsController(req, res, next) {
  try {
    const sets = await listDataMapSets(req.user.id);
    return res.status(200).json({ sets });
  } catch (error) {
    return next(error);
  }
}

async function createDataMapSetController(req, res, next) {
  try {
    const set = await createDataMapSet(req.user.id, req.body || {});
    return res.status(201).json({ set });
  } catch (error) {
    return next(error);
  }
}

async function updateDataMapSetController(req, res, next) {
  try {
    const set = await updateDataMapSet(req.user.id, req.params.setId, req.body || {});

    if (!set) {
      return res.status(404).json({ error: 'Data map set not found' });
    }

    return res.status(200).json({ set });
  } catch (error) {
    return next(error);
  }
}

async function deleteDataMapSetController(req, res, next) {
  try {
    const result = await deleteDataMapSet(req.user.id, req.params.setId);

    if (result.reason === 'not_found') {
      return res.status(404).json({ error: 'Data map set not found' });
    }

    if (result.reason === 'in_use') {
      return res.status(409).json({ error: 'Data map set is in use by a data map rule' });
    }

    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
}

async function listDataMapRulesController(req, res, next) {
  try {
    const rules = await listDataMapRules(req.user.id);
    return res.status(200).json({ rules });
  } catch (error) {
    return next(error);
  }
}

async function createDataMapRuleController(req, res, next) {
  try {
    const rule = await createDataMapRule(req.user.id, req.body || {});
    return res.status(201).json({ rule });
  } catch (error) {
    return next(error);
  }
}

async function updateDataMapRuleController(req, res, next) {
  try {
    const rule = await updateDataMapRule(req.user.id, req.params.ruleId, req.body || {});

    if (!rule) {
      return res.status(404).json({ error: 'Data map rule not found' });
    }

    return res.status(200).json({ rule });
  } catch (error) {
    return next(error);
  }
}

async function deleteDataMapRuleController(req, res, next) {
  try {
    const result = await deleteDataMapRule(req.user.id, req.params.ruleId);

    if (result.reason === 'not_found') {
      return res.status(404).json({ error: 'Data map rule not found' });
    }

    if (result.reason === 'in_use') {
      return res.status(409).json({ error: 'Data map rule is in use' });
    }

    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
}

async function listReconciliationRulesController(req, res, next) {
  try {
    const rules = await listReconciliationRules(req.user.id);
    return res.status(200).json({ rules });
  } catch (error) {
    return next(error);
  }
}

async function createReconciliationRuleController(req, res, next) {
  try {
    const rule = await createReconciliationRule(req.user.id, req.body || {});
    return res.status(201).json({ rule });
  } catch (error) {
    return next(error);
  }
}

async function updateReconciliationRuleController(req, res, next) {
  try {
    const rule = await updateReconciliationRule(req.user.id, req.params.ruleId, req.body || {});

    if (!rule) {
      return res.status(404).json({ error: 'Reconciliation rule not found' });
    }

    return res.status(200).json({ rule });
  } catch (error) {
    return next(error);
  }
}

async function deleteReconciliationRuleController(req, res, next) {
  try {
    const result = await deleteReconciliationRule(req.user.id, req.params.ruleId);

    if (result.reason === 'not_found') {
      return res.status(404).json({ error: 'Reconciliation rule not found' });
    }

    if (result.reason === 'in_use') {
      return res.status(409).json({ error: 'Reconciliation rule is in use' });
    }

    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
}

async function listMatchingSetsController(req, res, next) {
  try {
    const matchingSets = await listMatchingSets(req.user.id, req.params.ruleId);

    if (!matchingSets) {
      return res.status(404).json({ error: 'Reconciliation rule not found' });
    }

    return res.status(200).json({ matchingSets });
  } catch (error) {
    return next(error);
  }
}

async function createMatchingSetController(req, res, next) {
  try {
    const matchingSet = await createMatchingSet(req.user.id, req.params.ruleId, req.body || {});

    if (!matchingSet) {
      return res.status(404).json({ error: 'Reconciliation rule not found' });
    }

    return res.status(201).json({ matchingSet });
  } catch (error) {
    return next(error);
  }
}

async function forceReconcileMatchingSetController(req, res, next) {
  try {
    const matchingSet = await updateMatchingSetStatus(
      req.user.id,
      req.params.ruleId,
      req.params.matchingSetId,
      'force_reconciled'
    );

    if (!matchingSet) {
      return res.status(404).json({ error: 'Matching set not found' });
    }

    return res.status(200).json({ matchingSet });
  } catch (error) {
    return next(error);
  }
}

async function rejectMatchingSetController(req, res, next) {
  try {
    const matchingSet = await updateMatchingSetStatus(
      req.user.id,
      req.params.ruleId,
      req.params.matchingSetId,
      'rejected'
    );

    if (!matchingSet) {
      return res.status(404).json({ error: 'Matching set not found' });
    }

    return res.status(200).json({ matchingSet });
  } catch (error) {
    return next(error);
  }
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
