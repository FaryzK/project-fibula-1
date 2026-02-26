import React, { useEffect, useState } from 'react';
import {
  createMatchingSet,
  createReconciliationRule,
  deleteReconciliationRule,
  forceReconcileMatchingSet,
  listMatchingSets,
  listReconciliationRules,
  rejectMatchingSet,
  updateReconciliationRule
} from '../../services/dataMapperReconciliationApi';

const EMPTY_ARRAY_TEXT = '[]';

function parseArrayJson(value, fieldName) {
  let parsed;
  try {
    parsed = JSON.parse(value);
  } catch (_error) {
    throw new Error(`${fieldName} must be valid JSON`);
  }

  if (!Array.isArray(parsed)) {
    throw new Error(`${fieldName} must be a JSON array`);
  }

  return parsed;
}

function parseObjectOrNullJson(value, fieldName) {
  let parsed;
  try {
    parsed = JSON.parse(value);
  } catch (_error) {
    throw new Error(`${fieldName} must be valid JSON`);
  }

  if (parsed !== null && typeof parsed !== 'object') {
    throw new Error(`${fieldName} must be a JSON object or null`);
  }

  return parsed;
}

export function ReconciliationTab() {
  const [rules, setRules] = useState([]);
  const [matchingSets, setMatchingSets] = useState([]);
  const [isLoadingRules, setIsLoadingRules] = useState(false);
  const [isLoadingMatchingSets, setIsLoadingMatchingSets] = useState(false);
  const [selectedRuleId, setSelectedRuleId] = useState(null);
  const [errorText, setErrorText] = useState('');

  const [ruleName, setRuleName] = useState('');
  const [anchorExtractor, setAnchorExtractor] = useState('');
  const [targetExtractorsText, setTargetExtractorsText] = useState(EMPTY_ARRAY_TEXT);
  const [variationsText, setVariationsText] = useState(EMPTY_ARRAY_TEXT);
  const [nodeUsagesText, setNodeUsagesText] = useState(EMPTY_ARRAY_TEXT);
  const [editingRuleId, setEditingRuleId] = useState(null);

  const [anchorDocumentText, setAnchorDocumentText] = useState('{}');
  const [documentsText, setDocumentsText] = useState(EMPTY_ARRAY_TEXT);
  const [comparisonRowsText, setComparisonRowsText] = useState(EMPTY_ARRAY_TEXT);
  const [variationIndexText, setVariationIndexText] = useState('0');

  async function loadRules() {
    setIsLoadingRules(true);
    setErrorText('');

    try {
      const data = await listReconciliationRules();
      setRules(data);
    } catch (error) {
      setErrorText(error?.response?.data?.error || 'Failed to load reconciliation rules');
    } finally {
      setIsLoadingRules(false);
    }
  }

  async function loadMatchingSets(ruleId) {
    if (!ruleId) {
      setMatchingSets([]);
      return;
    }

    setIsLoadingMatchingSets(true);
    setErrorText('');

    try {
      const data = await listMatchingSets(ruleId);
      setMatchingSets(data);
    } catch (error) {
      setErrorText(error?.response?.data?.error || 'Failed to load matching sets');
    } finally {
      setIsLoadingMatchingSets(false);
    }
  }

  useEffect(() => {
    loadRules();
  }, []);

  useEffect(() => {
    loadMatchingSets(selectedRuleId);
  }, [selectedRuleId]);

  function resetRuleForm() {
    setEditingRuleId(null);
    setRuleName('');
    setAnchorExtractor('');
    setTargetExtractorsText(EMPTY_ARRAY_TEXT);
    setVariationsText(EMPTY_ARRAY_TEXT);
    setNodeUsagesText(EMPTY_ARRAY_TEXT);
  }

  async function handleRuleSubmit() {
    if (!ruleName.trim()) {
      setErrorText('Reconciliation rule name is required');
      return;
    }

    let targetExtractors;
    let variations;
    let nodeUsages;
    try {
      targetExtractors = parseArrayJson(targetExtractorsText, 'Target extractors');
      variations = parseArrayJson(variationsText, 'Variations');
      nodeUsages = parseArrayJson(nodeUsagesText, 'Node usages');
    } catch (error) {
      setErrorText(error.message);
      return;
    }

    setErrorText('');

    try {
      if (editingRuleId) {
        await updateReconciliationRule(editingRuleId, {
          name: ruleName,
          anchorExtractor,
          targetExtractors,
          variations,
          nodeUsages
        });
      } else {
        await createReconciliationRule({
          name: ruleName,
          anchorExtractor,
          targetExtractors,
          variations,
          nodeUsages
        });
      }

      resetRuleForm();
      await loadRules();
    } catch (error) {
      setErrorText(error?.response?.data?.error || 'Failed to save reconciliation rule');
    }
  }

  async function handleRuleDelete(ruleId) {
    setErrorText('');

    try {
      await deleteReconciliationRule(ruleId);
      if (selectedRuleId === ruleId) {
        setSelectedRuleId(null);
      }
      await loadRules();
    } catch (error) {
      setErrorText(error?.response?.data?.error || 'Failed to delete reconciliation rule');
    }
  }

  function beginRuleEdit(rule) {
    setEditingRuleId(rule.id);
    setRuleName(rule.name);
    setAnchorExtractor(rule.anchorExtractor || '');
    setTargetExtractorsText(JSON.stringify(rule.targetExtractors || [], null, 2));
    setVariationsText(JSON.stringify(rule.variations || [], null, 2));
    setNodeUsagesText(JSON.stringify(rule.nodeUsages || [], null, 2));
  }

  async function handleMatchingSetSubmit() {
    if (!selectedRuleId) {
      setErrorText('Select a reconciliation rule first');
      return;
    }

    let anchorDocument;
    let documents;
    let comparisonRows;
    try {
      anchorDocument = parseObjectOrNullJson(anchorDocumentText, 'Anchor document');
      documents = parseArrayJson(documentsText, 'Documents');
      comparisonRows = parseArrayJson(comparisonRowsText, 'Comparison rows');
    } catch (error) {
      setErrorText(error.message);
      return;
    }

    const variationIndex = Number(variationIndexText);
    if (!Number.isInteger(variationIndex) || variationIndex < 0) {
      setErrorText('Variation index must be a non-negative integer');
      return;
    }

    setErrorText('');

    try {
      await createMatchingSet(selectedRuleId, {
        anchorDocument,
        documents,
        comparisonRows,
        variationIndex
      });
      await loadMatchingSets(selectedRuleId);
    } catch (error) {
      setErrorText(error?.response?.data?.error || 'Failed to create matching set');
    }
  }

  async function handleForceReconcile(matchingSetId) {
    if (!selectedRuleId) {
      return;
    }

    setErrorText('');

    try {
      await forceReconcileMatchingSet(selectedRuleId, matchingSetId);
      await loadMatchingSets(selectedRuleId);
    } catch (error) {
      setErrorText(error?.response?.data?.error || 'Failed to force reconcile');
    }
  }

  async function handleReject(matchingSetId) {
    if (!selectedRuleId) {
      return;
    }

    setErrorText('');

    try {
      await rejectMatchingSet(selectedRuleId, matchingSetId);
      await loadMatchingSets(selectedRuleId);
    } catch (error) {
      setErrorText(error?.response?.data?.error || 'Failed to reject matching set');
    }
  }

  return (
    <section className="panel">
      <h2>Reconciliation Rules</h2>
      <p>Create reconciliation rules and review matching sets.</p>

      <label htmlFor="reconciliation-rule-name">Rule name</label>
      <br />
      <input
        id="reconciliation-rule-name"
        type="text"
        value={ruleName}
        onChange={(event) => setRuleName(event.target.value)}
      />
      <br />
      <label htmlFor="reconciliation-anchor-extractor">Anchor extractor</label>
      <br />
      <input
        id="reconciliation-anchor-extractor"
        type="text"
        value={anchorExtractor}
        onChange={(event) => setAnchorExtractor(event.target.value)}
      />
      <br />
      <label htmlFor="reconciliation-target-extractors">Target extractors (JSON array)</label>
      <br />
      <textarea
        id="reconciliation-target-extractors"
        rows={3}
        value={targetExtractorsText}
        onChange={(event) => setTargetExtractorsText(event.target.value)}
      />
      <br />
      <label htmlFor="reconciliation-variations">Variations (JSON array)</label>
      <br />
      <textarea
        id="reconciliation-variations"
        rows={5}
        value={variationsText}
        onChange={(event) => setVariationsText(event.target.value)}
      />
      <br />
      <label htmlFor="reconciliation-node-usages">Node usages (JSON array)</label>
      <br />
      <textarea
        id="reconciliation-node-usages"
        rows={3}
        value={nodeUsagesText}
        onChange={(event) => setNodeUsagesText(event.target.value)}
      />
      <br />
      <button type="button" onClick={handleRuleSubmit}>
        {editingRuleId ? 'Save Reconciliation Rule' : 'Add Reconciliation Rule'}
      </button>
      {editingRuleId ? (
        <button type="button" onClick={resetRuleForm}>
          Cancel Edit
        </button>
      ) : null}

      {errorText ? <p className="status-error">{errorText}</p> : null}
      {isLoadingRules ? <p>Loading reconciliation rules...</p> : null}
      {!isLoadingRules && rules.length === 0 ? <p>No reconciliation rules yet.</p> : null}

      <ul>
        {rules.map((rule) => (
          <li key={rule.id}>
            <strong>{rule.name}</strong>
            <p>Anchor: {rule.anchorExtractor || '(not set)'}</p>
            <p>Target extractors: {rule.targetExtractors?.length || 0}</p>
            <p>Variations: {rule.variations?.length || 0}</p>
            <p>Used by nodes: {rule.nodeUsages?.length || 0}</p>
            <button type="button" onClick={() => setSelectedRuleId(rule.id)}>
              View Matching Sets
            </button>
            <button type="button" onClick={() => beginRuleEdit(rule)}>
              Edit
            </button>
            <button type="button" onClick={() => handleRuleDelete(rule.id)}>
              Delete
            </button>
          </li>
        ))}
      </ul>

      <h3>Matching Sets</h3>
      {!selectedRuleId ? <p>Select a reconciliation rule to view matching sets.</p> : null}

      {selectedRuleId ? (
        <div>
          <p>Rule ID: {selectedRuleId}</p>

          <label htmlFor="matching-set-anchor-document">Anchor document (JSON object or null)</label>
          <br />
          <textarea
            id="matching-set-anchor-document"
            rows={3}
            value={anchorDocumentText}
            onChange={(event) => setAnchorDocumentText(event.target.value)}
          />
          <br />
          <label htmlFor="matching-set-documents">Documents (JSON array)</label>
          <br />
          <textarea
            id="matching-set-documents"
            rows={3}
            value={documentsText}
            onChange={(event) => setDocumentsText(event.target.value)}
          />
          <br />
          <label htmlFor="matching-set-comparison-rows">Comparison rows (JSON array)</label>
          <br />
          <textarea
            id="matching-set-comparison-rows"
            rows={3}
            value={comparisonRowsText}
            onChange={(event) => setComparisonRowsText(event.target.value)}
          />
          <br />
          <label htmlFor="matching-set-variation-index">Variation index</label>
          <br />
          <input
            id="matching-set-variation-index"
            type="number"
            min={0}
            value={variationIndexText}
            onChange={(event) => setVariationIndexText(event.target.value)}
          />
          <br />
          <button type="button" onClick={handleMatchingSetSubmit}>
            Create Matching Set
          </button>
        </div>
      ) : null}

      {isLoadingMatchingSets ? <p>Loading matching sets...</p> : null}
      {selectedRuleId && !isLoadingMatchingSets && matchingSets.length === 0 ? (
        <p>No matching sets yet.</p>
      ) : null}

      <ul>
        {matchingSets.map((matchingSet) => (
          <li key={matchingSet.id}>
            <strong>{matchingSet.id}</strong>
            <p>Status: {matchingSet.status}</p>
            <p>Variation index: {matchingSet.variationIndex}</p>
            <p>Documents: {matchingSet.documents?.length || 0}</p>
            <button type="button" onClick={() => handleForceReconcile(matchingSet.id)}>
              Force Reconcile
            </button>
            <button type="button" onClick={() => handleReject(matchingSet.id)}>
              Reject
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
