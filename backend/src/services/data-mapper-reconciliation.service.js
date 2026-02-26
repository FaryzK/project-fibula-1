const { randomUUID } = require('crypto');

const dataMapSetsById = new Map();
const dataMapRulesById = new Map();
const reconciliationRulesById = new Map();
const matchingSetsByRuleId = new Map();

function listOwnedItems(store, userId) {
  return Array.from(store.values())
    .filter((item) => item.userId === userId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

function listDataMapSets(userId) {
  return listOwnedItems(dataMapSetsById, userId);
}

function createDataMapSet(userId, payload) {
  const now = new Date().toISOString();
  const dataMapSet = {
    id: randomUUID(),
    userId,
    name: payload.name?.trim() || 'Untitled Data Map Set',
    headers: payload.headers || [],
    records: payload.records || [],
    createdAt: now,
    updatedAt: now
  };

  dataMapSetsById.set(dataMapSet.id, dataMapSet);
  return dataMapSet;
}

function updateDataMapSet(userId, setId, payload) {
  const existing = dataMapSetsById.get(setId);

  if (!existing || existing.userId !== userId) {
    return null;
  }

  const updated = {
    ...existing,
    ...(payload.name !== undefined ? { name: payload.name.trim() || existing.name } : {}),
    ...(payload.headers !== undefined ? { headers: payload.headers } : {}),
    ...(payload.records !== undefined ? { records: payload.records } : {}),
    updatedAt: new Date().toISOString()
  };

  dataMapSetsById.set(setId, updated);
  return updated;
}

function deleteDataMapSet(userId, setId) {
  const existing = dataMapSetsById.get(setId);

  if (!existing || existing.userId !== userId) {
    return { success: false, reason: 'not_found' };
  }

  const hasUsage = Array.from(dataMapRulesById.values()).some((rule) => {
    if (rule.userId !== userId) {
      return false;
    }

    return (rule.lookups || []).some((lookup) => lookup.setId === setId);
  });

  if (hasUsage) {
    return { success: false, reason: 'in_use' };
  }

  dataMapSetsById.delete(setId);
  return { success: true };
}

function listDataMapRules(userId) {
  return listOwnedItems(dataMapRulesById, userId);
}

function createDataMapRule(userId, payload) {
  const now = new Date().toISOString();
  const rule = {
    id: randomUUID(),
    userId,
    name: payload.name?.trim() || 'Untitled Data Map Rule',
    extractorName: payload.extractorName || '',
    mapTargets: payload.mapTargets || [],
    lookups: payload.lookups || [],
    nodeUsages: payload.nodeUsages || [],
    createdAt: now,
    updatedAt: now
  };

  dataMapRulesById.set(rule.id, rule);
  return rule;
}

function updateDataMapRule(userId, ruleId, payload) {
  const existing = dataMapRulesById.get(ruleId);

  if (!existing || existing.userId !== userId) {
    return null;
  }

  const updated = {
    ...existing,
    ...(payload.name !== undefined ? { name: payload.name.trim() || existing.name } : {}),
    ...(payload.extractorName !== undefined ? { extractorName: payload.extractorName } : {}),
    ...(payload.mapTargets !== undefined ? { mapTargets: payload.mapTargets } : {}),
    ...(payload.lookups !== undefined ? { lookups: payload.lookups } : {}),
    ...(payload.nodeUsages !== undefined ? { nodeUsages: payload.nodeUsages } : {}),
    updatedAt: new Date().toISOString()
  };

  dataMapRulesById.set(ruleId, updated);
  return updated;
}

function deleteDataMapRule(userId, ruleId) {
  const existing = dataMapRulesById.get(ruleId);

  if (!existing || existing.userId !== userId) {
    return { success: false, reason: 'not_found' };
  }

  if ((existing.nodeUsages || []).length) {
    return { success: false, reason: 'in_use' };
  }

  dataMapRulesById.delete(ruleId);
  return { success: true };
}

function listReconciliationRules(userId) {
  return listOwnedItems(reconciliationRulesById, userId);
}

function createReconciliationRule(userId, payload) {
  const now = new Date().toISOString();
  const rule = {
    id: randomUUID(),
    userId,
    name: payload.name?.trim() || 'Untitled Reconciliation Rule',
    anchorExtractor: payload.anchorExtractor || '',
    targetExtractors: payload.targetExtractors || [],
    variations: payload.variations || [],
    nodeUsages: payload.nodeUsages || [],
    createdAt: now,
    updatedAt: now
  };

  reconciliationRulesById.set(rule.id, rule);
  matchingSetsByRuleId.set(rule.id, []);
  return rule;
}

function updateReconciliationRule(userId, ruleId, payload) {
  const existing = reconciliationRulesById.get(ruleId);

  if (!existing || existing.userId !== userId) {
    return null;
  }

  const updated = {
    ...existing,
    ...(payload.name !== undefined ? { name: payload.name.trim() || existing.name } : {}),
    ...(payload.anchorExtractor !== undefined ? { anchorExtractor: payload.anchorExtractor } : {}),
    ...(payload.targetExtractors !== undefined ? { targetExtractors: payload.targetExtractors } : {}),
    ...(payload.variations !== undefined ? { variations: payload.variations } : {}),
    ...(payload.nodeUsages !== undefined ? { nodeUsages: payload.nodeUsages } : {}),
    updatedAt: new Date().toISOString()
  };

  reconciliationRulesById.set(ruleId, updated);
  return updated;
}

function deleteReconciliationRule(userId, ruleId) {
  const existing = reconciliationRulesById.get(ruleId);

  if (!existing || existing.userId !== userId) {
    return { success: false, reason: 'not_found' };
  }

  if ((existing.nodeUsages || []).length) {
    return { success: false, reason: 'in_use' };
  }

  reconciliationRulesById.delete(ruleId);
  matchingSetsByRuleId.delete(ruleId);
  return { success: true };
}

function ensureOwnedRule(userId, ruleId) {
  const rule = reconciliationRulesById.get(ruleId);

  if (!rule || rule.userId !== userId) {
    return null;
  }

  return rule;
}

function listMatchingSets(userId, ruleId) {
  const rule = ensureOwnedRule(userId, ruleId);

  if (!rule) {
    return null;
  }

  return matchingSetsByRuleId.get(ruleId) || [];
}

function createMatchingSet(userId, ruleId, payload) {
  const rule = ensureOwnedRule(userId, ruleId);

  if (!rule) {
    return null;
  }

  const matchingSet = {
    id: randomUUID(),
    ruleId,
    anchorDocument: payload.anchorDocument || null,
    documents: payload.documents || [],
    comparisonRows: payload.comparisonRows || [],
    variationIndex: payload.variationIndex || 0,
    status: 'pending',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const current = matchingSetsByRuleId.get(ruleId) || [];
  matchingSetsByRuleId.set(ruleId, [...current, matchingSet]);
  return matchingSet;
}

function updateMatchingSetStatus(userId, ruleId, matchingSetId, status) {
  const rule = ensureOwnedRule(userId, ruleId);

  if (!rule) {
    return null;
  }

  const current = matchingSetsByRuleId.get(ruleId) || [];
  let found = null;

  const next = current.map((item) => {
    if (item.id !== matchingSetId) {
      return item;
    }

    found = {
      ...item,
      status,
      updatedAt: new Date().toISOString()
    };

    return found;
  });

  if (!found) {
    return null;
  }

  matchingSetsByRuleId.set(ruleId, next);
  return found;
}

function resetDataMapperReconciliationStore() {
  dataMapSetsById.clear();
  dataMapRulesById.clear();
  reconciliationRulesById.clear();
  matchingSetsByRuleId.clear();
}

module.exports = {
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
  resetDataMapperReconciliationStore,
  updateDataMapRule,
  updateDataMapSet,
  updateMatchingSetStatus,
  updateReconciliationRule
};
