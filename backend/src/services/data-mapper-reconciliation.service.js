const { randomUUID } = require('crypto');
const { ensureSchema, isDatabaseEnabled, query } = require('../db/postgres');
const {
  deleteEntity,
  getEntity,
  insertEntity,
  listEntities,
  updateEntity
} = require('../db/entity-store');

const dataMapSetsById = new Map();
const dataMapRulesById = new Map();
const reconciliationRulesById = new Map();
const matchingSetsByRuleId = new Map();

const TABLES = {
  dataMapSets: 'data_map_sets',
  dataMapRules: 'data_map_rules',
  reconciliationRules: 'reconciliation_rules',
  matchingSets: 'matching_sets'
};

function useMemoryStore() {
  return !isDatabaseEnabled();
}

function listOwnedItems(store, userId) {
  return Array.from(store.values())
    .filter((item) => item.userId === userId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

function toIsoString(value) {
  if (value instanceof Date) {
    return value.toISOString();
  }

  return new Date(value).toISOString();
}

function normalizeMatchingSetRow(row) {
  const data = row?.data && typeof row.data === 'object' ? row.data : {};

  return {
    id: row.id,
    userId: row.user_id,
    ruleId: row.rule_id,
    ...data,
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at)
  };
}

async function listDataMapSets(userId) {
  if (useMemoryStore()) {
    return listOwnedItems(dataMapSetsById, userId);
  }

  return listEntities(TABLES.dataMapSets, userId);
}

async function createDataMapSet(userId, payload) {
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

  if (useMemoryStore()) {
    dataMapSetsById.set(dataMapSet.id, dataMapSet);
    return dataMapSet;
  }

  return insertEntity(TABLES.dataMapSets, {
    id: dataMapSet.id,
    userId,
    data: {
      name: dataMapSet.name,
      headers: dataMapSet.headers,
      records: dataMapSet.records
    },
    createdAt: now,
    updatedAt: now
  });
}

async function updateDataMapSet(userId, setId, payload) {
  if (useMemoryStore()) {
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

  const existing = await getEntity(TABLES.dataMapSets, userId, setId);

  if (!existing) {
    return null;
  }

  const nextName = payload.name !== undefined ? payload.name.trim() || existing.name : existing.name;
  const nextHeaders = payload.headers !== undefined ? payload.headers : existing.headers || [];
  const nextRecords = payload.records !== undefined ? payload.records : existing.records || [];

  return updateEntity(
    TABLES.dataMapSets,
    userId,
    setId,
    {
      name: nextName,
      headers: nextHeaders,
      records: nextRecords
    },
    new Date().toISOString()
  );
}

async function deleteDataMapSet(userId, setId) {
  if (useMemoryStore()) {
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

  const existing = await getEntity(TABLES.dataMapSets, userId, setId);

  if (!existing) {
    return { success: false, reason: 'not_found' };
  }

  const rules = await listEntities(TABLES.dataMapRules, userId);
  const hasUsage = rules.some((rule) =>
    (rule.lookups || []).some((lookup) => lookup.setId === setId)
  );

  if (hasUsage) {
    return { success: false, reason: 'in_use' };
  }

  await deleteEntity(TABLES.dataMapSets, userId, setId);
  return { success: true };
}

async function listDataMapRules(userId) {
  if (useMemoryStore()) {
    return listOwnedItems(dataMapRulesById, userId);
  }

  return listEntities(TABLES.dataMapRules, userId);
}

async function createDataMapRule(userId, payload) {
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

  if (useMemoryStore()) {
    dataMapRulesById.set(rule.id, rule);
    return rule;
  }

  return insertEntity(TABLES.dataMapRules, {
    id: rule.id,
    userId,
    data: {
      name: rule.name,
      extractorName: rule.extractorName,
      mapTargets: rule.mapTargets,
      lookups: rule.lookups,
      nodeUsages: rule.nodeUsages
    },
    createdAt: now,
    updatedAt: now
  });
}

async function updateDataMapRule(userId, ruleId, payload) {
  if (useMemoryStore()) {
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

  const existing = await getEntity(TABLES.dataMapRules, userId, ruleId);

  if (!existing) {
    return null;
  }

  const nextName = payload.name !== undefined ? payload.name.trim() || existing.name : existing.name;
  const nextExtractorName =
    payload.extractorName !== undefined ? payload.extractorName : existing.extractorName;
  const nextMapTargets = payload.mapTargets !== undefined ? payload.mapTargets : existing.mapTargets;
  const nextLookups = payload.lookups !== undefined ? payload.lookups : existing.lookups;
  const nextNodeUsages =
    payload.nodeUsages !== undefined ? payload.nodeUsages : existing.nodeUsages || [];

  return updateEntity(
    TABLES.dataMapRules,
    userId,
    ruleId,
    {
      name: nextName,
      extractorName: nextExtractorName,
      mapTargets: nextMapTargets,
      lookups: nextLookups,
      nodeUsages: nextNodeUsages
    },
    new Date().toISOString()
  );
}

async function deleteDataMapRule(userId, ruleId) {
  if (useMemoryStore()) {
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

  const existing = await getEntity(TABLES.dataMapRules, userId, ruleId);

  if (!existing) {
    return { success: false, reason: 'not_found' };
  }

  if ((existing.nodeUsages || []).length) {
    return { success: false, reason: 'in_use' };
  }

  await deleteEntity(TABLES.dataMapRules, userId, ruleId);
  return { success: true };
}

async function listReconciliationRules(userId) {
  if (useMemoryStore()) {
    return listOwnedItems(reconciliationRulesById, userId);
  }

  return listEntities(TABLES.reconciliationRules, userId);
}

async function createReconciliationRule(userId, payload) {
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

  if (useMemoryStore()) {
    reconciliationRulesById.set(rule.id, rule);
    matchingSetsByRuleId.set(rule.id, []);
    return rule;
  }

  return insertEntity(TABLES.reconciliationRules, {
    id: rule.id,
    userId,
    data: {
      name: rule.name,
      anchorExtractor: rule.anchorExtractor,
      targetExtractors: rule.targetExtractors,
      variations: rule.variations,
      nodeUsages: rule.nodeUsages
    },
    createdAt: now,
    updatedAt: now
  });
}

async function updateReconciliationRule(userId, ruleId, payload) {
  if (useMemoryStore()) {
    const existing = reconciliationRulesById.get(ruleId);

    if (!existing || existing.userId !== userId) {
      return null;
    }

    const updated = {
      ...existing,
      ...(payload.name !== undefined ? { name: payload.name.trim() || existing.name } : {}),
      ...(payload.anchorExtractor !== undefined ? { anchorExtractor: payload.anchorExtractor } : {}),
      ...(payload.targetExtractors !== undefined
        ? { targetExtractors: payload.targetExtractors }
        : {}),
      ...(payload.variations !== undefined ? { variations: payload.variations } : {}),
      ...(payload.nodeUsages !== undefined ? { nodeUsages: payload.nodeUsages } : {}),
      updatedAt: new Date().toISOString()
    };

    reconciliationRulesById.set(ruleId, updated);
    return updated;
  }

  const existing = await getEntity(TABLES.reconciliationRules, userId, ruleId);

  if (!existing) {
    return null;
  }

  const nextName = payload.name !== undefined ? payload.name.trim() || existing.name : existing.name;
  const nextAnchor =
    payload.anchorExtractor !== undefined ? payload.anchorExtractor : existing.anchorExtractor;
  const nextTargets =
    payload.targetExtractors !== undefined ? payload.targetExtractors : existing.targetExtractors;
  const nextVariations =
    payload.variations !== undefined ? payload.variations : existing.variations;
  const nextNodeUsages =
    payload.nodeUsages !== undefined ? payload.nodeUsages : existing.nodeUsages || [];

  return updateEntity(
    TABLES.reconciliationRules,
    userId,
    ruleId,
    {
      name: nextName,
      anchorExtractor: nextAnchor,
      targetExtractors: nextTargets,
      variations: nextVariations,
      nodeUsages: nextNodeUsages
    },
    new Date().toISOString()
  );
}

async function deleteReconciliationRule(userId, ruleId) {
  if (useMemoryStore()) {
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

  const existing = await getEntity(TABLES.reconciliationRules, userId, ruleId);

  if (!existing) {
    return { success: false, reason: 'not_found' };
  }

  if ((existing.nodeUsages || []).length) {
    return { success: false, reason: 'in_use' };
  }

  await deleteEntity(TABLES.reconciliationRules, userId, ruleId);
  return { success: true };
}

async function ensureOwnedRule(userId, ruleId) {
  if (useMemoryStore()) {
    const rule = reconciliationRulesById.get(ruleId);

    if (!rule || rule.userId !== userId) {
      return null;
    }

    return rule;
  }

  return getEntity(TABLES.reconciliationRules, userId, ruleId);
}

async function listMatchingSets(userId, ruleId) {
  const rule = await ensureOwnedRule(userId, ruleId);

  if (!rule) {
    return null;
  }

  if (useMemoryStore()) {
    return matchingSetsByRuleId.get(ruleId) || [];
  }

  return listEntities(TABLES.matchingSets, userId, {
    where: 'rule_id = $2',
    params: [ruleId],
    extraSelect: 'rule_id',
    rowExtras: (row) => ({ ruleId: row.rule_id })
  });
}

async function createMatchingSet(userId, ruleId, payload) {
  const rule = await ensureOwnedRule(userId, ruleId);

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

  if (useMemoryStore()) {
    const current = matchingSetsByRuleId.get(ruleId) || [];
    matchingSetsByRuleId.set(ruleId, [...current, matchingSet]);
    return matchingSet;
  }

  return insertEntity(TABLES.matchingSets, {
    id: matchingSet.id,
    userId,
    data: {
      anchorDocument: matchingSet.anchorDocument,
      documents: matchingSet.documents,
      comparisonRows: matchingSet.comparisonRows,
      variationIndex: matchingSet.variationIndex,
      status: matchingSet.status
    },
    createdAt: matchingSet.createdAt,
    updatedAt: matchingSet.updatedAt
  }, {
    extraColumns: ['rule_id'],
    extraValues: [ruleId],
    extraSelect: 'rule_id',
    rowExtras: (row) => ({ ruleId: row.rule_id })
  });
}

async function updateMatchingSetStatus(userId, ruleId, matchingSetId, status) {
  const rule = await ensureOwnedRule(userId, ruleId);

  if (!rule) {
    return null;
  }

  if (useMemoryStore()) {
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

  await ensureSchema();

  const { rows } = await query(
    'SELECT id, user_id, rule_id, data, created_at, updated_at FROM matching_sets WHERE id = $1 AND user_id = $2 AND rule_id = $3',
    [matchingSetId, userId, ruleId]
  );

  if (!rows[0]) {
    return null;
  }

  const existing = rows[0];
  const nextData = {
    ...(existing.data || {}),
    status
  };
  const updatedAt = new Date().toISOString();

  const updateResult = await query(
    'UPDATE matching_sets SET data = $1, updated_at = $2 WHERE id = $3 AND user_id = $4 AND rule_id = $5 RETURNING id, user_id, rule_id, data, created_at, updated_at',
    [nextData, updatedAt, matchingSetId, userId, ruleId]
  );

  if (!updateResult.rows[0]) {
    return null;
  }

  return normalizeMatchingSetRow(updateResult.rows[0]);
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
