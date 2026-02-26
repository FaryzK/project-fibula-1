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
    <section className="panel-stack">
      <div className="panel">
        <div className="panel-header">
          <div>
            <h2>Reconciliation Rules</h2>
            <p>Create reconciliation rules and review matching sets.</p>
          </div>
        </div>

        {errorText ? <p className="status-error">{errorText}</p> : null}
      </div>

      <div className="panel-grid">
        <div className="panel">
          <div className="panel-header">
            <div>
              <h3>Rule Builder</h3>
              <p>Define the extractor relationships and variations.</p>
            </div>
          </div>

          <div className="form-grid">
            <label htmlFor="reconciliation-rule-name">Rule name</label>
            <input
              id="reconciliation-rule-name"
              type="text"
              value={ruleName}
              onChange={(event) => setRuleName(event.target.value)}
            />

            <label htmlFor="reconciliation-anchor-extractor">Anchor extractor</label>
            <input
              id="reconciliation-anchor-extractor"
              type="text"
              value={anchorExtractor}
              onChange={(event) => setAnchorExtractor(event.target.value)}
            />

            <label htmlFor="reconciliation-target-extractors">Target extractors (JSON array)</label>
            <textarea
              id="reconciliation-target-extractors"
              rows={3}
              value={targetExtractorsText}
              onChange={(event) => setTargetExtractorsText(event.target.value)}
            />

            <label htmlFor="reconciliation-variations">Variations (JSON array)</label>
            <textarea
              id="reconciliation-variations"
              rows={5}
              value={variationsText}
              onChange={(event) => setVariationsText(event.target.value)}
            />

            <label htmlFor="reconciliation-node-usages">Node usages (JSON array)</label>
            <textarea
              id="reconciliation-node-usages"
              rows={3}
              value={nodeUsagesText}
              onChange={(event) => setNodeUsagesText(event.target.value)}
            />
          </div>

          <div className="panel-actions">
            <button type="button" className="btn-primary" onClick={handleRuleSubmit}>
              {editingRuleId ? 'Save Reconciliation Rule' : 'Add Reconciliation Rule'}
            </button>
            {editingRuleId ? (
              <button type="button" className="btn btn-ghost" onClick={resetRuleForm}>
                Cancel Edit
              </button>
            ) : null}
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <div>
              <h3>Rule Library</h3>
              <p>Activate a rule to review matching sets.</p>
            </div>
          </div>

          {isLoadingRules ? <p>Loading reconciliation rules...</p> : null}
          {!isLoadingRules && rules.length === 0 ? <p>No reconciliation rules yet.</p> : null}

          {!isLoadingRules && rules.length > 0 ? (
            <div className="card-grid">
              {rules.map((rule) => (
                <div className="card-item" key={rule.id}>
                  <div className="card-title">{rule.name}</div>
                  <div className="card-meta">Anchor: {rule.anchorExtractor || '(not set)'}</div>
                  <div className="card-meta">Target extractors: {rule.targetExtractors?.length || 0}</div>
                  <div className="card-meta">Variations: {rule.variations?.length || 0}</div>
                  <div className="card-meta">Used by nodes: {rule.nodeUsages?.length || 0}</div>
                  <div className="panel-actions">
                    <button
                      type="button"
                      className="btn btn-outline"
                      onClick={() => setSelectedRuleId(rule.id)}
                    >
                      {selectedRuleId === rule.id ? 'Viewing Matching Sets' : 'View Matching Sets'}
                    </button>
                    <button type="button" className="btn btn-outline" onClick={() => beginRuleEdit(rule)}>
                      Edit
                    </button>
                    <button type="button" className="btn-danger" onClick={() => handleRuleDelete(rule.id)}>
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <div className="panel-grid">
        <div className="panel">
          <div className="panel-header">
            <div>
              <h3>Matching Set Builder</h3>
              <p>Create matching sets for the selected reconciliation rule.</p>
            </div>
          </div>

          {!selectedRuleId ? <p>Select a reconciliation rule to build matching sets.</p> : null}

          {selectedRuleId ? (
            <div className="form-grid">
              <span className="tag">Rule ID: {selectedRuleId}</span>

              <label htmlFor="matching-set-anchor-document">Anchor document (JSON object or null)</label>
              <textarea
                id="matching-set-anchor-document"
                rows={3}
                value={anchorDocumentText}
                onChange={(event) => setAnchorDocumentText(event.target.value)}
              />

              <label htmlFor="matching-set-documents">Documents (JSON array)</label>
              <textarea
                id="matching-set-documents"
                rows={3}
                value={documentsText}
                onChange={(event) => setDocumentsText(event.target.value)}
              />

              <label htmlFor="matching-set-comparison-rows">Comparison rows (JSON array)</label>
              <textarea
                id="matching-set-comparison-rows"
                rows={3}
                value={comparisonRowsText}
                onChange={(event) => setComparisonRowsText(event.target.value)}
              />

              <label htmlFor="matching-set-variation-index">Variation index</label>
              <input
                id="matching-set-variation-index"
                type="number"
                min={0}
                value={variationIndexText}
                onChange={(event) => setVariationIndexText(event.target.value)}
              />

              <div className="panel-actions">
                <button type="button" className="btn-primary" onClick={handleMatchingSetSubmit}>
                  Create Matching Set
                </button>
              </div>
            </div>
          ) : null}
        </div>

        <div className="panel">
          <div className="panel-header">
            <div>
              <h3>Matching Sets</h3>
              <p>Monitor matching outcomes for the selected rule.</p>
            </div>
          </div>

          {isLoadingMatchingSets ? <p>Loading matching sets...</p> : null}
          {selectedRuleId && !isLoadingMatchingSets && matchingSets.length === 0 ? (
            <p>No matching sets yet.</p>
          ) : null}

          {!isLoadingMatchingSets && matchingSets.length > 0 ? (
            <div className="card-grid">
              {matchingSets.map((matchingSet) => (
                <div className="card-item" key={matchingSet.id}>
                  <div className="card-title">{matchingSet.id}</div>
                  <div className="card-meta">Status: {matchingSet.status}</div>
                  <div className="card-meta">Variation index: {matchingSet.variationIndex}</div>
                  <div className="card-meta">Documents: {matchingSet.documents?.length || 0}</div>
                  <div className="panel-actions">
                    <button type="button" className="btn btn-outline" onClick={() => handleForceReconcile(matchingSet.id)}>
                      Force Reconcile
                    </button>
                    <button type="button" className="btn-danger" onClick={() => handleReject(matchingSet.id)}>
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
