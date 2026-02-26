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
import { UsageList } from '../../components/UsageList';

const COMPARISON_OPERATORS = ['=', '!=', '>', '>=', '<', '<='];
const ARITHMETIC_OPERATORS = ['+', '-', '*', '/'];

function createVariation(index) {
  return {
    name: `Variation ${index + 1}`,
    documentMatching: [],
    tableMatching: [],
    comparisons: []
  };
}

function withCurrentOption(options, value, labelPrefix) {
  const trimmed = String(value || '').trim();
  if (!trimmed) {
    return options;
  }

  const exists = options.some((option) => option.value === trimmed);
  if (exists) {
    return options;
  }

  return [{ value: trimmed, label: `${labelPrefix}: ${trimmed}` }, ...options];
}

function getExtractorSchema(extractorName, extractorSchemaByName) {
  return extractorSchemaByName.get(extractorName) || { headerFields: [], tableTypes: [] };
}

function getFieldOptionsForExtractor(extractorName, extractorSchemaByName) {
  const schema = getExtractorSchema(extractorName, extractorSchemaByName);

  const headerOptions = (schema.headerFields || [])
    .map((field) => String(field.fieldName || '').trim())
    .filter(Boolean)
    .map((fieldName) => ({
      value: fieldName,
      label: `Header • ${fieldName}`
    }));

  const tableOptions = (schema.tableTypes || []).flatMap((tableType) => {
    const tableName = String(tableType.tableName || '').trim();
    return (tableType.columns || [])
      .map((column) => String(column.columnName || '').trim())
      .filter(Boolean)
      .map((columnName) => ({
        value: tableName ? `${tableName}.${columnName}` : columnName,
        label: tableName ? `Table ${tableName} • ${columnName}` : `Table • ${columnName}`
      }));
  });

  const seen = new Set();
  return [...headerOptions, ...tableOptions].filter((option) => {
    if (seen.has(option.value)) {
      return false;
    }
    seen.add(option.value);
    return true;
  });
}

function getTableOptionsForExtractor(extractorName, extractorSchemaByName) {
  const schema = getExtractorSchema(extractorName, extractorSchemaByName);

  const tableNames = (schema.tableTypes || [])
    .map((tableType) => String(tableType.tableName || '').trim())
    .filter(Boolean);

  const seen = new Set();
  return tableNames.filter((tableName) => {
    if (seen.has(tableName)) {
      return false;
    }
    seen.add(tableName);
    return true;
  });
}

function getColumnOptionsForExtractorTable(extractorName, tableName, extractorSchemaByName) {
  const schema = getExtractorSchema(extractorName, extractorSchemaByName);
  const normalizedTableName = String(tableName || '').trim();
  if (!normalizedTableName) {
    return [];
  }

  const targetTable = (schema.tableTypes || []).find(
    (tableType) => String(tableType.tableName || '').trim() === normalizedTableName
  );

  const columns = (targetTable?.columns || [])
    .map((column) => String(column.columnName || '').trim())
    .filter(Boolean);

  const seen = new Set();
  return columns.filter((columnName) => {
    if (seen.has(columnName)) {
      return false;
    }
    seen.add(columnName);
    return true;
  });
}

function parseOperand(rawValue) {
  const trimmed = String(rawValue || '').trim();
  const separatorIndex = trimmed.indexOf('.');
  if (separatorIndex <= 0 || separatorIndex >= trimmed.length - 1) {
    return null;
  }

  return {
    extractor: trimmed.slice(0, separatorIndex).trim(),
    field: trimmed.slice(separatorIndex + 1).trim()
  };
}

function parseComparisonExpression(expression) {
  const trimmed = String(expression || '').trim();
  if (!trimmed) {
    return null;
  }

  const comparisonMatch = trimmed.match(/\s(>=|<=|!=|=|>|<)\s/);
  if (!comparisonMatch) {
    return null;
  }

  const operator = comparisonMatch[1];
  const leftSide = trimmed.slice(0, comparisonMatch.index).trim();
  const rightSide = trimmed
    .slice(comparisonMatch.index + comparisonMatch[0].length)
    .trim();

  const arithmeticMatch = rightSide.match(/\s([+\-*/])\s/);

  const rightPrimaryRaw = arithmeticMatch
    ? rightSide.slice(0, arithmeticMatch.index).trim()
    : rightSide;
  const rightSecondaryRaw = arithmeticMatch
    ? rightSide.slice(arithmeticMatch.index + arithmeticMatch[0].length).trim()
    : '';

  const leftOperand = parseOperand(leftSide);
  const rightPrimaryOperand = parseOperand(rightPrimaryRaw);
  const rightSecondaryOperand = rightSecondaryRaw ? parseOperand(rightSecondaryRaw) : null;

  if (!leftOperand || !rightPrimaryOperand) {
    return null;
  }

  return {
    leftExtractor: leftOperand.extractor,
    leftField: leftOperand.field,
    comparisonOperator: operator,
    rightPrimaryExtractor: rightPrimaryOperand.extractor,
    rightPrimaryField: rightPrimaryOperand.field,
    arithmeticOperator: arithmeticMatch?.[1] || '',
    rightSecondaryExtractor: rightSecondaryOperand?.extractor || '',
    rightSecondaryField: rightSecondaryOperand?.field || ''
  };
}

function buildComparisonExpression(comparison) {
  const leftExtractor = String(comparison.leftExtractor || '').trim();
  const leftField = String(comparison.leftField || '').trim();
  const rightPrimaryExtractor = String(comparison.rightPrimaryExtractor || '').trim();
  const rightPrimaryField = String(comparison.rightPrimaryField || '').trim();

  if (!leftExtractor || !leftField || !rightPrimaryExtractor || !rightPrimaryField) {
    return '';
  }

  const comparisonOperator = String(comparison.comparisonOperator || '=').trim() || '=';
  const rightPrimaryExpression = `${rightPrimaryExtractor}.${rightPrimaryField}`;

  const arithmeticOperator = String(comparison.arithmeticOperator || '').trim();
  const rightSecondaryExtractor = String(comparison.rightSecondaryExtractor || '').trim();
  const rightSecondaryField = String(comparison.rightSecondaryField || '').trim();

  const rightExpression =
    arithmeticOperator && rightSecondaryExtractor && rightSecondaryField
      ? `${rightPrimaryExpression} ${arithmeticOperator} ${rightSecondaryExtractor}.${rightSecondaryField}`
      : rightPrimaryExpression;

  return `${leftExtractor}.${leftField} ${comparisonOperator} ${rightExpression}`;
}

function hydrateComparison(comparison) {
  const parsed = parseComparisonExpression(comparison.expression || '');
  return {
    ...comparison,
    leftExtractor: comparison.leftExtractor || parsed?.leftExtractor || '',
    leftField: comparison.leftField || parsed?.leftField || '',
    comparisonOperator: comparison.comparisonOperator || parsed?.comparisonOperator || '=',
    rightPrimaryExtractor: comparison.rightPrimaryExtractor || parsed?.rightPrimaryExtractor || '',
    rightPrimaryField: comparison.rightPrimaryField || parsed?.rightPrimaryField || '',
    arithmeticOperator: comparison.arithmeticOperator || parsed?.arithmeticOperator || '',
    rightSecondaryExtractor: comparison.rightSecondaryExtractor || parsed?.rightSecondaryExtractor || '',
    rightSecondaryField: comparison.rightSecondaryField || parsed?.rightSecondaryField || ''
  };
}

function hydrateVariation(variation, index) {
  return {
    name: variation?.name || `Variation ${index + 1}`,
    documentMatching: (variation?.documentMatching || []).map((item) => ({ ...item })),
    tableMatching: (variation?.tableMatching || []).map((item) => ({
      ...item,
      targetExtractor: item.targetExtractor || ''
    })),
    comparisons: (variation?.comparisons || []).map((comparison) =>
      hydrateComparison(comparison)
    )
  };
}

function sanitizeVariationsForSave(variations) {
  return (variations || []).map((variation, index) => ({
    name: String(variation.name || '').trim() || `Variation ${index + 1}`,
    documentMatching: (variation.documentMatching || []).map((item) => ({
      leftExtractor: item.leftExtractor || '',
      leftField: item.leftField || '',
      rightExtractor: item.rightExtractor || '',
      rightField: item.rightField || '',
      matchType: item.matchType || 'exact',
      threshold: Number(item.threshold ?? 90)
    })),
    tableMatching: (variation.tableMatching || []).map((item) => ({
      targetExtractor: item.targetExtractor || '',
      anchorTable: item.anchorTable || '',
      targetTable: item.targetTable || '',
      anchorColumn: item.anchorColumn || '',
      targetColumn: item.targetColumn || ''
    })),
    comparisons: (variation.comparisons || []).map((item) => ({
      label: item.label || '',
      expression: buildComparisonExpression(item) || item.expression || '',
      toleranceType: item.toleranceType || 'absolute',
      toleranceValue: Number(item.toleranceValue ?? 0)
    }))
  }));
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
  const [nodeUsages, setNodeUsages] = useState([]);
  const [activeSection, setActiveSection] = useState('basics');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorText, setErrorText] = useState('');
  const [statusText, setStatusText] = useState('');

  const extractorOptions = useMemo(
    () => extractors.map((item) => ({ id: item.id, name: item.name })),
    [extractors]
  );

  const extractorSchemaByName = useMemo(() => {
    const map = new Map();
    extractors.forEach((extractor) => {
      map.set(extractor.name, extractor.schema || { headerFields: [], tableTypes: [] });
    });
    return map;
  }, [extractors]);

  const expectedExtractorOptions = useMemo(() => {
    const expectedNames = new Set([anchorExtractor, ...targetExtractors].filter(Boolean));
    return extractorOptions.filter((option) => expectedNames.has(option.name));
  }, [extractorOptions, anchorExtractor, targetExtractors]);

  const targetExtractorOptions = useMemo(
    () => extractorOptions.filter((option) => targetExtractors.includes(option.name)),
    [extractorOptions, targetExtractors]
  );

  function extractorSelectionOptions(currentValue) {
    const baseOptions = (expectedExtractorOptions.length
      ? expectedExtractorOptions
      : extractorOptions
    ).map((option) => ({
      value: option.name,
      label: option.name
    }));
    return withCurrentOption(baseOptions, currentValue, 'Current extractor');
  }

  function fieldOptionsForExtractor(extractorName, currentValue) {
    const options = getFieldOptionsForExtractor(extractorName, extractorSchemaByName);
    return withCurrentOption(options, currentValue, 'Current field');
  }

  function tableOptionsForExtractor(extractorName, currentValue) {
    const options = getTableOptionsForExtractor(extractorName, extractorSchemaByName).map(
      (tableName) => ({
        value: tableName,
        label: tableName
      })
    );
    return withCurrentOption(options, currentValue, 'Current table');
  }

  function columnOptionsForTable(extractorName, tableName, currentValue) {
    const options = getColumnOptionsForExtractorTable(
      extractorName,
      tableName,
      extractorSchemaByName
    ).map((columnName) => ({
      value: columnName,
      label: columnName
    }));
    return withCurrentOption(options, currentValue, 'Current column');
  }

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
          setVariations(
            (found.variations && found.variations.length
              ? found.variations
              : [createVariation(0)]
            ).map((variation, index) => hydrateVariation(variation, index))
          );
          const sets = await listMatchingSets(ruleId);
          setMatchingSets(sets || []);
          setNodeUsages(found.nodeUsages || []);
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
      const sanitizedVariations = sanitizeVariationsForSave(variations);

      if (isNew) {
        const rule = await createReconciliationRule({
          name: ruleName,
          anchorExtractor,
          targetExtractors,
          variations: sanitizedVariations,
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
        variations: sanitizedVariations,
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
          <div className="segmented-control" role="tablist">
            {[
              { key: 'basics', label: 'Basics' },
              { key: 'variations', label: 'Variations' },
              { key: 'monitoring', label: 'Monitoring' }
            ].map((section) => (
              <button
                key={section.key}
                type="button"
                aria-pressed={activeSection === section.key}
                onClick={() => setActiveSection(section.key)}
              >
                {section.label}
              </button>
            ))}
          </div>

          {activeSection === 'basics' ? (
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
          ) : null}

          {activeSection === 'variations' ? (
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
                      {extractorSelectionOptions(item.leftExtractor).map((option) => (
                        <option key={`${option.value}-${option.label}`} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>

                    <label>Left field</label>
                    <select
                      value={item.leftField || ''}
                      onChange={(event) =>
                        updateVariationItem(variationIndex, 'documentMatching', itemIndex, 'leftField', event.target.value)
                      }
                    >
                      <option value="">
                        {item.leftExtractor ? 'Select field' : 'Select extractor first'}
                      </option>
                      {fieldOptionsForExtractor(item.leftExtractor, item.leftField).map((option) => (
                        <option key={`${option.value}-${option.label}`} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>

                    <label>Right extractor</label>
                    <select
                      value={item.rightExtractor || ''}
                      onChange={(event) =>
                        updateVariationItem(variationIndex, 'documentMatching', itemIndex, 'rightExtractor', event.target.value)
                      }
                    >
                      <option value="">Select extractor</option>
                      {extractorSelectionOptions(item.rightExtractor).map((option) => (
                        <option key={`${option.value}-${option.label}`} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>

                    <label>Right field</label>
                    <select
                      value={item.rightField || ''}
                      onChange={(event) =>
                        updateVariationItem(variationIndex, 'documentMatching', itemIndex, 'rightField', event.target.value)
                      }
                    >
                      <option value="">
                        {item.rightExtractor ? 'Select field' : 'Select extractor first'}
                      </option>
                      {fieldOptionsForExtractor(item.rightExtractor, item.rightField).map((option) => (
                        <option key={`${option.value}-${option.label}`} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>

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
                        targetExtractor: targetExtractors[0] || '',
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
                    <label>Target extractor</label>
                    <select
                      value={item.targetExtractor || ''}
                      onChange={(event) =>
                        updateVariationItem(
                          variationIndex,
                          'tableMatching',
                          itemIndex,
                          'targetExtractor',
                          event.target.value
                        )
                      }
                    >
                      <option value="">Select target extractor</option>
                      {withCurrentOption(
                        targetExtractorOptions.map((option) => ({
                          value: option.name,
                          label: option.name
                        })),
                        item.targetExtractor,
                        'Current extractor'
                      ).map((option) => (
                        <option key={`${option.value}-${option.label}`} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>

                    <label>Anchor table type</label>
                    <select
                      value={item.anchorTable || ''}
                      onChange={(event) =>
                        updateVariationItem(variationIndex, 'tableMatching', itemIndex, 'anchorTable', event.target.value)
                      }
                    >
                      <option value="">
                        {anchorExtractor ? 'Select anchor table' : 'Select anchor extractor first'}
                      </option>
                      {tableOptionsForExtractor(anchorExtractor, item.anchorTable).map((option) => (
                        <option key={`${option.value}-${option.label}`} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>

                    <label>Target table type</label>
                    <select
                      value={item.targetTable || ''}
                      onChange={(event) =>
                        updateVariationItem(variationIndex, 'tableMatching', itemIndex, 'targetTable', event.target.value)
                      }
                    >
                      <option value="">
                        {item.targetExtractor ? 'Select target table' : 'Select target extractor first'}
                      </option>
                      {tableOptionsForExtractor(item.targetExtractor, item.targetTable).map((option) => (
                        <option key={`${option.value}-${option.label}`} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>

                    <label>Anchor column</label>
                    <select
                      value={item.anchorColumn || ''}
                      onChange={(event) =>
                        updateVariationItem(variationIndex, 'tableMatching', itemIndex, 'anchorColumn', event.target.value)
                      }
                    >
                      <option value="">
                        {item.anchorTable ? 'Select anchor column' : 'Select anchor table first'}
                      </option>
                      {columnOptionsForTable(
                        anchorExtractor,
                        item.anchorTable,
                        item.anchorColumn
                      ).map((option) => (
                        <option key={`${option.value}-${option.label}`} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>

                    <label>Target column</label>
                    <select
                      value={item.targetColumn || ''}
                      onChange={(event) =>
                        updateVariationItem(variationIndex, 'tableMatching', itemIndex, 'targetColumn', event.target.value)
                      }
                    >
                      <option value="">
                        {item.targetTable ? 'Select target column' : 'Select target table first'}
                      </option>
                      {columnOptionsForTable(
                        item.targetExtractor,
                        item.targetTable,
                        item.targetColumn
                      ).map((option) => (
                        <option key={`${option.value}-${option.label}`} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>

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
                        leftExtractor: anchorExtractor || '',
                        leftField: '',
                        comparisonOperator: '=',
                        rightPrimaryExtractor: targetExtractors[0] || anchorExtractor || '',
                        rightPrimaryField: '',
                        arithmeticOperator: '-',
                        rightSecondaryExtractor: '',
                        rightSecondaryField: '',
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

                    <label>Left extractor</label>
                    <select
                      value={item.leftExtractor || ''}
                      onChange={(event) =>
                        updateVariationItem(
                          variationIndex,
                          'comparisons',
                          itemIndex,
                          'leftExtractor',
                          event.target.value
                        )
                      }
                    >
                      <option value="">Select extractor</option>
                      {extractorSelectionOptions(item.leftExtractor).map((option) => (
                        <option key={`${option.value}-${option.label}`} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>

                    <label>Left field</label>
                    <select
                      value={item.leftField || ''}
                      onChange={(event) =>
                        updateVariationItem(
                          variationIndex,
                          'comparisons',
                          itemIndex,
                          'leftField',
                          event.target.value
                        )
                      }
                    >
                      <option value="">
                        {item.leftExtractor ? 'Select field' : 'Select extractor first'}
                      </option>
                      {fieldOptionsForExtractor(item.leftExtractor, item.leftField).map((option) => (
                        <option key={`${option.value}-${option.label}`} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>

                    <label>Compare operator</label>
                    <select
                      value={item.comparisonOperator || '='}
                      onChange={(event) =>
                        updateVariationItem(
                          variationIndex,
                          'comparisons',
                          itemIndex,
                          'comparisonOperator',
                          event.target.value
                        )
                      }
                    >
                      {COMPARISON_OPERATORS.map((operator) => (
                        <option key={operator} value={operator}>
                          {operator}
                        </option>
                      ))}
                    </select>

                    <label>Right extractor</label>
                    <select
                      value={item.rightPrimaryExtractor || ''}
                      onChange={(event) =>
                        updateVariationItem(
                          variationIndex,
                          'comparisons',
                          itemIndex,
                          'rightPrimaryExtractor',
                          event.target.value
                        )
                      }
                    >
                      <option value="">Select extractor</option>
                      {extractorSelectionOptions(item.rightPrimaryExtractor).map((option) => (
                        <option key={`${option.value}-${option.label}`} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>

                    <label>Right field</label>
                    <select
                      value={item.rightPrimaryField || ''}
                      onChange={(event) =>
                        updateVariationItem(
                          variationIndex,
                          'comparisons',
                          itemIndex,
                          'rightPrimaryField',
                          event.target.value
                        )
                      }
                    >
                      <option value="">
                        {item.rightPrimaryExtractor ? 'Select field' : 'Select extractor first'}
                      </option>
                      {fieldOptionsForExtractor(
                        item.rightPrimaryExtractor,
                        item.rightPrimaryField
                      ).map((option) => (
                        <option key={`${option.value}-${option.label}`} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>

                    <label>Math operator (optional)</label>
                    <select
                      value={item.arithmeticOperator || ''}
                      onChange={(event) =>
                        updateVariationItem(
                          variationIndex,
                          'comparisons',
                          itemIndex,
                          'arithmeticOperator',
                          event.target.value
                        )
                      }
                    >
                      <option value="">No arithmetic</option>
                      {ARITHMETIC_OPERATORS.map((operator) => (
                        <option key={operator} value={operator}>
                          {operator}
                        </option>
                      ))}
                    </select>

                    <label>Secondary extractor</label>
                    <select
                      value={item.rightSecondaryExtractor || ''}
                      disabled={!item.arithmeticOperator}
                      onChange={(event) =>
                        updateVariationItem(
                          variationIndex,
                          'comparisons',
                          itemIndex,
                          'rightSecondaryExtractor',
                          event.target.value
                        )
                      }
                    >
                      <option value="">
                        {item.arithmeticOperator ? 'Select extractor' : 'Enable math operator first'}
                      </option>
                      {extractorSelectionOptions(item.rightSecondaryExtractor).map((option) => (
                        <option key={`${option.value}-${option.label}`} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>

                    <label>Secondary field</label>
                    <select
                      value={item.rightSecondaryField || ''}
                      disabled={!item.arithmeticOperator || !item.rightSecondaryExtractor}
                      onChange={(event) =>
                        updateVariationItem(
                          variationIndex,
                          'comparisons',
                          itemIndex,
                          'rightSecondaryField',
                          event.target.value
                        )
                      }
                    >
                      <option value="">
                        {item.rightSecondaryExtractor ? 'Select field' : 'Select secondary extractor first'}
                      </option>
                      {fieldOptionsForExtractor(
                        item.rightSecondaryExtractor,
                        item.rightSecondaryField
                      ).map((option) => (
                        <option key={`${option.value}-${option.label}`} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>

                    <label>Generated expression</label>
                    <input
                      type="text"
                      value={buildComparisonExpression(item) || item.expression || ''}
                      placeholder="PO.Amount = Invoice.Amount - CreditNote.Amount"
                      readOnly
                    />
                    <p className="muted-text">
                      Use dropdowns to build formulas without typing paths manually.
                    </p>

                    <label>Tolerance type</label>
                    <select
                      value={item.toleranceType || 'absolute'}
                      onChange={(event) =>
                        updateVariationItem(variationIndex, 'comparisons', itemIndex, 'toleranceType', event.target.value)
                      }
                    >
                      <option value="absolute">Absolute</option>
                      <option value="percentage">Percentage</option>
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
          ) : null}

          {activeSection === 'monitoring' ? (
            <>
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
                            <button
                              type="button"
                              className="btn btn-outline"
                              onClick={() => handleForceReconcile(matchingSet.id)}
                            >
                              Force Reconcile
                            </button>
                            <button
                              type="button"
                              className="btn-danger"
                              onClick={() => handleReject(matchingSet.id)}
                            >
                              Reject
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </section>
              ) : null}

              {!isNew ? (
                <section className="panel">
                  <div className="panel-header">
                    <div>
                      <h2>Workflow Usage</h2>
                      <p>Jump to the nodes using this reconciliation rule.</p>
                    </div>
                  </div>
                  <UsageList usages={nodeUsages} />
                </section>
              ) : null}
            </>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
