import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  createReconciliationRule,
  forceReconcileMatchingSet,
  listMatchingSets,
  listReconciliationRules,
  rejectMatchingSet,
  updateReconciliationRule
} from '../../services/dataMapperReconciliationApi';
import { listExtractors } from '../../services/configServiceNodesApi';

function createVariation(index) {
  return {
    name: `Variation ${index + 1}`,
    documentMatching: [],
    tableMatching: [],
    comparisons: []
  };
}

export function ReconciliationDetailPage() {
  const { ruleId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const isNew = !ruleId;

  const [ruleName, setRuleName] = useState('');
  const [anchorExtractor, setAnchorExtractor] = useState('');
  const [targetExtractors, setTargetExtractors] = useState([]);
  const [variations, setVariations] = useState([createVariation(0)]);
  const [matchingSets, setMatchingSets] = useState([]);
  const [extractors, setExtractors] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorText, setErrorText] = useState('');
  const [statusText, setStatusText] = useState('');

  const extractorOptions = useMemo(
    () => extractors.map((item) => ({ id: item.id, name: item.name })),
    [extractors]
  );

  useEffect(() => {
    async function loadRule() {
      setIsLoading(true);
      setErrorText('');

      try {
        const [rules, extractorList] = await Promise.all([
          listReconciliationRules(),
          listExtractors()
        ]);

        setExtractors(extractorList);

        if (!isNew) {
          const found = rules.find((item) => item.id === ruleId);
          if (!found) {
            setErrorText('Reconciliation rule not found');
            return;
          }
          setRuleName(found.name || '');
          setAnchorExtractor(found.anchorExtractor || '');
          setTargetExtractors(found.targetExtractors || []);
          setVariations((found.variations && found.variations.length) ? found.variations : [createVariation(0)]);
          const sets = await listMatchingSets(ruleId);
          setMatchingSets(sets || []);
        }
      } catch (error) {
        setErrorText(error?.response?.data?.error || 'Failed to load reconciliation rule');
      } finally {
        setIsLoading(false);
      }
    }

    loadRule();
  }, [ruleId, isNew]);

  function toggleTargetExtractor(name) {
    setTargetExtractors((current) =>
      current.includes(name) ? current.filter((item) => item !== name) : [...current, name]
    );
  }

  function updateVariation(index, field, value) {
    setVariations((current) =>
      current.map((item, idx) => (idx === index ? { ...item, [field]: value } : item))
    );
  }

  function addVariation() {
    setVariations((current) => [...current, createVariation(current.length)]);
  }

  function removeVariation(index) {
    setVariations((current) => current.filter((_, idx) => idx !== index));
  }

  function addVariationItem(variationIndex, field, item) {
    setVariations((current) =>
      current.map((variation, idx) => {
        if (idx !== variationIndex) {
          return variation;
        }
        return { ...variation, [field]: [...(variation[field] || []), item] };
      })
    );
  }

  function updateVariationItem(variationIndex, field, itemIndex, key, value) {
    setVariations((current) =>
      current.map((variation, idx) => {
        if (idx !== variationIndex) {
          return variation;
        }
        const items = [...(variation[field] || [])];
        items[itemIndex] = { ...items[itemIndex], [key]: value };
        return { ...variation, [field]: items };
      })
    );
  }

  function removeVariationItem(variationIndex, field, itemIndex) {
    setVariations((current) =>
      current.map((variation, idx) => {
        if (idx !== variationIndex) {
          return variation;
        }
        return { ...variation, [field]: (variation[field] || []).filter((_, idx2) => idx2 !== itemIndex) };
      })
    );
  }

  async function refreshMatchingSets() {
    if (isNew) {
      return;
    }
    const sets = await listMatchingSets(ruleId);
    setMatchingSets(sets || []);
  }

  async function handleSave() {
    if (!ruleName.trim()) {
      setErrorText('Reconciliation rule name is required');
      return;
    }

    setIsSaving(true);
    setErrorText('');
    setStatusText('');

    try {
      if (isNew) {
        const rule = await createReconciliationRule({
          name: ruleName,
          anchorExtractor,
          targetExtractors,
          variations,
          nodeUsages: []
        });
        setStatusText('Reconciliation rule created');
        const params = new URLSearchParams(location.search);
        const returnTo = params.get('returnTo');
        const returnNodeId = params.get('nodeId');

        if (returnTo && returnNodeId) {
          navigate(`${returnTo}?nodeId=${returnNodeId}&assignReconciliationId=${rule.id}`);
          return;
        }

        navigate(`/app/services/reconciliation/${rule.id}`);
        return;
      }

      await updateReconciliationRule(ruleId, {
        name: ruleName,
        anchorExtractor,
        targetExtractors,
        variations,
        nodeUsages: []
      });
      setStatusText('Reconciliation rule updated');
    } catch (error) {
      setErrorText(error?.response?.data?.error || 'Failed to save reconciliation rule');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleForceReconcile(matchingSetId) {
    if (!ruleId) {
      return;
    }

    setErrorText('');

    try {
      await forceReconcileMatchingSet(ruleId, matchingSetId);
      await refreshMatchingSets();
    } catch (error) {
      setErrorText(error?.response?.data?.error || 'Failed to force reconcile');
    }
  }

  async function handleReject(matchingSetId) {
    if (!ruleId) {
      return;
    }

    setErrorText('');

    try {
      await rejectMatchingSet(ruleId, matchingSetId);
      await refreshMatchingSets();
    } catch (error) {
      setErrorText(error?.response?.data?.error || 'Failed to reject matching set');
    }
  }

  return (
    <div className="panel-stack">
      <header className="section-header">
        <div>
          <span className="section-eyebrow">Service Setup</span>
          <h1>{isNew ? 'New Reconciliation Rule' : 'Reconciliation Rule'}</h1>
          <p className="section-subtitle">Define how documents are matched and compared.</p>
        </div>
        <div className="section-actions">
          <Link className="btn btn-ghost" to="/app/services/reconciliation">
            Back to Reconciliation
          </Link>
          <button type="button" className="btn-primary" onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Rule'}
          </button>
        </div>
      </header>

      {errorText ? <p className="status-error">{errorText}</p> : null}
      {statusText ? <p className="status-ok">{statusText}</p> : null}
      {isLoading ? <p>Loading reconciliation rule...</p> : null}

      {!isLoading ? (
        <>
          <section className="panel">
            <div className="panel-header">
              <div>
                <h2>Rule Basics</h2>
                <p>Select anchor and target extractors.</p>
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
              <select
                id="reconciliation-anchor-extractor"
                value={anchorExtractor}
                onChange={(event) => setAnchorExtractor(event.target.value)}
              >
                <option value="">Select anchor extractor</option>
                {extractorOptions.map((option) => (
                  <option key={option.id} value={option.name}>
                    {option.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="panel-header">
              <h3>Target Extractors</h3>
            </div>
            <div className="tag-grid">
              {extractorOptions.map((option) => (
                <label className="tag-select" key={option.id}>
                  <input
                    type="checkbox"
                    checked={targetExtractors.includes(option.name)}
                    onChange={() => toggleTargetExtractor(option.name)}
                  />
                  {option.name}
                </label>
              ))}
            </div>
          </section>

          <section className="panel">
            <div className="panel-header">
              <div>
                <h2>Variations</h2>
                <p>Define matching and comparison logic. The system tries them in order.</p>
              </div>
              <button type="button" className="btn btn-outline" onClick={addVariation}>
                Add Variation
              </button>
            </div>

            {variations.map((variation, variationIndex) => (
              <div className="panel" key={`variation-${variationIndex}`}>
                <div className="panel-header">
                  <div>
                    <h3>{variation.name || `Variation ${variationIndex + 1}`}</h3>
                    <p>Configure document matching, table matching, and comparisons.</p>
                  </div>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => removeVariation(variationIndex)}
                  >
                    Remove Variation
                  </button>
                </div>

                <div className="form-grid">
                  <label>Variation name</label>
                  <input
                    type="text"
                    value={variation.name || ''}
                    onChange={(event) => updateVariation(variationIndex, 'name', event.target.value)}
                  />
                </div>

                <div className="panel-header">
                  <div>
                    <h4>Document Matching</h4>
                    <p>Link anchor and target document fields.</p>
                  </div>
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() =>
                      addVariationItem(variationIndex, 'documentMatching', {
                        leftExtractor: anchorExtractor,
                        leftField: '',
                        rightExtractor: targetExtractors[0] || '',
                        rightField: '',
                        matchType: 'exact',
                        threshold: 90
                      })
                    }
                  >
                    Add Match Link
                  </button>
                </div>

                {(variation.documentMatching || []).length === 0 ? <p>No document matches yet.</p> : null}

                {(variation.documentMatching || []).map((item, itemIndex) => (
                  <div className="form-grid" key={`doc-match-${variationIndex}-${itemIndex}`}>
                    <label>Left extractor</label>
                    <select
                      value={item.leftExtractor || ''}
                      onChange={(event) =>
                        updateVariationItem(variationIndex, 'documentMatching', itemIndex, 'leftExtractor', event.target.value)
                      }
                    >
                      <option value="">Select extractor</option>
                      {extractorOptions.map((option) => (
                        <option key={option.id} value={option.name}>
                          {option.name}
                        </option>
                      ))}
                    </select>

                    <label>Left field</label>
                    <input
                      type="text"
                      value={item.leftField || ''}
                      onChange={(event) =>
                        updateVariationItem(variationIndex, 'documentMatching', itemIndex, 'leftField', event.target.value)
                      }
                      placeholder="PO_Number"
                    />

                    <label>Right extractor</label>
                    <select
                      value={item.rightExtractor || ''}
                      onChange={(event) =>
                        updateVariationItem(variationIndex, 'documentMatching', itemIndex, 'rightExtractor', event.target.value)
                      }
                    >
                      <option value="">Select extractor</option>
                      {extractorOptions.map((option) => (
                        <option key={option.id} value={option.name}>
                          {option.name}
                        </option>
                      ))}
                    </select>

                    <label>Right field</label>
                    <input
                      type="text"
                      value={item.rightField || ''}
                      onChange={(event) =>
                        updateVariationItem(variationIndex, 'documentMatching', itemIndex, 'rightField', event.target.value)
                      }
                      placeholder="Order_Reference"
                    />

                    <label>Match type</label>
                    <select
                      value={item.matchType || 'exact'}
                      onChange={(event) =>
                        updateVariationItem(variationIndex, 'documentMatching', itemIndex, 'matchType', event.target.value)
                      }
                    >
                      <option value="exact">Exact match</option>
                      <option value="fuzzy">Fuzzy match</option>
                    </select>

                    {item.matchType === 'fuzzy' ? (
                      <>
                        <label>Threshold (%)</label>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={item.threshold ?? 90}
                          onChange={(event) =>
                            updateVariationItem(variationIndex, 'documentMatching', itemIndex, 'threshold', Number(event.target.value))
                          }
                        />
                      </>
                    ) : null}

                    <div className="panel-actions">
                      <button
                        type="button"
                        className="btn btn-ghost"
                        onClick={() => removeVariationItem(variationIndex, 'documentMatching', itemIndex)}
                      >
                        Remove Match
                      </button>
                    </div>
                  </div>
                ))}

                <div className="panel-header">
                  <div>
                    <h4>Table Matching</h4>
                    <p>Align table rows across documents.</p>
                  </div>
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() =>
                      addVariationItem(variationIndex, 'tableMatching', {
                        anchorTable: '',
                        targetTable: '',
                        anchorColumn: '',
                        targetColumn: ''
                      })
                    }
                  >
                    Add Table Match
                  </button>
                </div>

                {(variation.tableMatching || []).length === 0 ? <p>No table matching rules yet.</p> : null}

                {(variation.tableMatching || []).map((item, itemIndex) => (
                  <div className="form-grid" key={`table-match-${variationIndex}-${itemIndex}`}>
                    <label>Anchor table type</label>
                    <input
                      type="text"
                      value={item.anchorTable || ''}
                      onChange={(event) =>
                        updateVariationItem(variationIndex, 'tableMatching', itemIndex, 'anchorTable', event.target.value)
                      }
                      placeholder="PO_Table"
                    />

                    <label>Target table type</label>
                    <input
                      type="text"
                      value={item.targetTable || ''}
                      onChange={(event) =>
                        updateVariationItem(variationIndex, 'tableMatching', itemIndex, 'targetTable', event.target.value)
                      }
                      placeholder="Invoice_Table"
                    />

                    <label>Anchor column</label>
                    <input
                      type="text"
                      value={item.anchorColumn || ''}
                      onChange={(event) =>
                        updateVariationItem(variationIndex, 'tableMatching', itemIndex, 'anchorColumn', event.target.value)
                      }
                      placeholder="PartNumber"
                    />

                    <label>Target column</label>
                    <input
                      type="text"
                      value={item.targetColumn || ''}
                      onChange={(event) =>
                        updateVariationItem(variationIndex, 'tableMatching', itemIndex, 'targetColumn', event.target.value)
                      }
                      placeholder="ItemSKU"
                    />

                    <div className="panel-actions">
                      <button
                        type="button"
                        className="btn btn-ghost"
                        onClick={() => removeVariationItem(variationIndex, 'tableMatching', itemIndex)}
                      >
                        Remove Table Match
                      </button>
                    </div>
                  </div>
                ))}

                <div className="panel-header">
                  <div>
                    <h4>Comparison Logic</h4>
                    <p>Define formulas and tolerances.</p>
                  </div>
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() =>
                      addVariationItem(variationIndex, 'comparisons', {
                        label: '',
                        expression: '',
                        toleranceType: 'absolute',
                        toleranceValue: 0
                      })
                    }
                  >
                    Add Comparison
                  </button>
                </div>

                {(variation.comparisons || []).length === 0 ? <p>No comparisons yet.</p> : null}

                {(variation.comparisons || []).map((item, itemIndex) => (
                  <div className="form-grid" key={`comparison-${variationIndex}-${itemIndex}`}>
                    <label>Label</label>
                    <input
                      type="text"
                      value={item.label || ''}
                      onChange={(event) =>
                        updateVariationItem(variationIndex, 'comparisons', itemIndex, 'label', event.target.value)
                      }
                      placeholder="Invoice vs PO total"
                    />

                    <label>Expression</label>
                    <input
                      type="text"
                      value={item.expression || ''}
                      onChange={(event) =>
                        updateVariationItem(variationIndex, 'comparisons', itemIndex, 'expression', event.target.value)
                      }
                      placeholder="Invoice.Total - Credit.Total = PO.Total"
                    />

                    <label>Tolerance type</label>
                    <select
                      value={item.toleranceType || 'absolute'}
                      onChange={(event) =>
                        updateVariationItem(variationIndex, 'comparisons', itemIndex, 'toleranceType', event.target.value)
                      }
                    >
                      <option value="absolute">Absolute</option>
                      <option value="percent">Percent</option>
                    </select>

                    <label>Tolerance value</label>
                    <input
                      type="number"
                      min={0}
                      value={item.toleranceValue ?? 0}
                      onChange={(event) =>
                        updateVariationItem(variationIndex, 'comparisons', itemIndex, 'toleranceValue', Number(event.target.value))
                      }
                    />

                    <div className="panel-actions">
                      <button
                        type="button"
                        className="btn btn-ghost"
                        onClick={() => removeVariationItem(variationIndex, 'comparisons', itemIndex)}
                      >
                        Remove Comparison
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </section>

          {!isNew ? (
            <section className="panel">
              <div className="panel-header">
                <div>
                  <h2>Matching Sets</h2>
                  <p>Monitor reconciliation outcomes for this rule.</p>
                </div>
                <button type="button" className="btn btn-outline" onClick={refreshMatchingSets}>
                  Refresh
                </button>
              </div>

              {matchingSets.length === 0 ? <p>No matching sets yet.</p> : null}

              {matchingSets.length > 0 ? (
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
            </section>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
