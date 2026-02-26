import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  createDataMapRule,
  listDataMapRules,
  listDataMapSets,
  updateDataMapRule
} from '../../services/dataMapperReconciliationApi';
import { listExtractors } from '../../services/configServiceNodesApi';
import { UsageList } from '../../components/UsageList';

const LOOKUP_LIMIT = 7;
const CALC_OPERATORS = ['*', '/', '+', '-'];

function buildCalculationExpression(schemaField, operator, setColumn) {
  if (!schemaField || !operator || !setColumn) {
    return '';
  }
  return `schema.${schemaField} ${operator} set.${setColumn}`;
}

function parseCalculationExpression(expression) {
  const trimmed = String(expression || '').trim();
  if (!trimmed) {
    return null;
  }

  const match = trimmed.match(/^schema\.(.+?)\s*([+\-*/])\s*set\.(.+)$/i);
  if (!match) {
    return null;
  }

  return {
    schemaField: match[1]?.trim() || '',
    operator: match[2] || '*',
    setColumn: match[3]?.trim() || ''
  };
}

function hydrateMapTargets(targets) {
  return (targets || []).map((target) => {
    const parsed = parseCalculationExpression(target.calculation || '');
    return {
      ...target,
      setColumn: target.setColumn || target.calculationSetColumn || parsed?.setColumn || '',
      calculationSchemaField:
        target.calculationSchemaField || parsed?.schemaField || target.schemaFieldPath || '',
      calculationOperator: target.calculationOperator || parsed?.operator || '*'
    };
  });
}

function withCurrentOption(options, value, labelPrefix) {
  const nextValue = String(value || '').trim();
  if (!nextValue) {
    return options;
  }

  const exists = options.some((option) => option.value === nextValue);
  if (exists) {
    return options;
  }

  return [{ value: nextValue, label: `${labelPrefix}: ${nextValue}` }, ...options];
}

function sanitizeMapTargetsForSave(targets) {
  return (targets || []).map((target) => {
    const mode = target.mode || 'map';
    const parsed = parseCalculationExpression(target.calculation || '');
    const setColumn = target.setColumn || parsed?.setColumn || '';
    const calculationSchemaField =
      target.calculationSchemaField || parsed?.schemaField || target.schemaFieldPath || '';
    const calculationOperator = target.calculationOperator || parsed?.operator || '*';

    return {
      schemaFieldPath: target.schemaFieldPath || '',
      setId: target.setId || '',
      setColumn,
      mode,
      calculation:
        mode === 'calculation'
          ? buildCalculationExpression(calculationSchemaField, calculationOperator, setColumn) ||
            target.calculation ||
            ''
          : ''
    };
  });
}

export function DataMapRuleDetailPage() {
  const { ruleId } = useParams();
  const navigate = useNavigate();
  const isNew = !ruleId;

  const [ruleName, setRuleName] = useState('');
  const [extractorName, setExtractorName] = useState('');
  const [mapTargets, setMapTargets] = useState([]);
  const [lookups, setLookups] = useState([]);
  const [dataMapSets, setDataMapSets] = useState([]);
  const [extractors, setExtractors] = useState([]);
  const [nodeUsages, setNodeUsages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorText, setErrorText] = useState('');
  const [statusText, setStatusText] = useState('');

  useEffect(() => {
    async function loadDependencies() {
      setIsLoading(true);
      setErrorText('');

      try {
        const [rules, sets, extractorList] = await Promise.all([
          listDataMapRules(),
          listDataMapSets(),
          listExtractors()
        ]);
        setDataMapSets(sets);
        setExtractors(extractorList);

        if (!isNew) {
          const found = rules.find((item) => item.id === ruleId);
          if (!found) {
            setErrorText('Data map rule not found');
            return;
          }
          setRuleName(found.name || '');
          setExtractorName(found.extractorName || '');
          setMapTargets(hydrateMapTargets(found.mapTargets || []));
          setLookups(found.lookups || []);
          setNodeUsages(found.nodeUsages || []);
        }
      } catch (error) {
        setErrorText(error?.response?.data?.error || 'Failed to load data map rule');
      } finally {
        setIsLoading(false);
      }
    }

    loadDependencies();
  }, [ruleId, isNew]);

  const setOptions = useMemo(
    () =>
      dataMapSets.map((set) => ({
        value: set.id,
        label: set.name,
        headers: (set.headers || []).map((header) => String(header || '').trim()).filter(Boolean)
      })),
    [dataMapSets]
  );

  const schemaFieldOptions = useMemo(() => {
    const selectedExtractor = extractors.find((extractor) => extractor.name === extractorName);
    if (!selectedExtractor) {
      return [];
    }

    const headerOptions = (selectedExtractor.schema?.headerFields || [])
      .map((field) => String(field.fieldName || '').trim())
      .filter(Boolean)
      .map((fieldName) => ({
        value: fieldName,
        label: `Header • ${fieldName}`
      }));

    const tableColumnOptions = (selectedExtractor.schema?.tableTypes || []).flatMap((table) => {
      const tableName = String(table.tableName || '').trim();

      return (table.columns || [])
        .map((column) => String(column.columnName || '').trim())
        .filter(Boolean)
        .map((columnName) => ({
          value: tableName ? `${tableName}.${columnName}` : columnName,
          label: tableName ? `Table ${tableName} • ${columnName}` : `Table • ${columnName}`
        }));
    });

    const seen = new Set();
    return [...headerOptions, ...tableColumnOptions].filter((option) => {
      if (seen.has(option.value)) {
        return false;
      }
      seen.add(option.value);
      return true;
    });
  }, [extractors, extractorName]);

  function headersForSet(setId) {
    return setOptions.find((option) => option.value === setId)?.headers || [];
  }

  function setColumnOptionsForValue(setId, currentValue) {
    const headers = headersForSet(setId);
    const value = String(currentValue || '').trim();
    if (!value || headers.includes(value)) {
      return headers;
    }

    return [value, ...headers];
  }

  function addMapTarget() {
    setMapTargets((current) => [
      ...current,
      {
        schemaFieldPath: '',
        setId: '',
        setColumn: '',
        mode: 'map',
        calculation: '',
        calculationSchemaField: '',
        calculationOperator: '*'
      }
    ]);
  }

  function updateMapTarget(index, field, value) {
    setMapTargets((current) => {
      return current.map((item, idx) => {
        if (idx !== index) {
          return item;
        }

        const next = { ...item, [field]: value };

        if (field === 'setId') {
          const availableHeaders = headersForSet(value);
          if (next.setColumn && !availableHeaders.includes(next.setColumn)) {
            next.setColumn = '';
          }
        }

        if (next.mode === 'calculation') {
          if (field === 'mode' && value === 'calculation' && !next.calculationSchemaField) {
            next.calculationSchemaField = next.schemaFieldPath || '';
          }
          if (!next.calculationOperator) {
            next.calculationOperator = '*';
          }
          next.calculation = buildCalculationExpression(
            next.calculationSchemaField || '',
            next.calculationOperator || '*',
            next.setColumn || ''
          );
        } else {
          next.calculation = '';
        }

        return next;
      });
    });
  }

  function removeMapTarget(index) {
    setMapTargets((current) => current.filter((_, idx) => idx !== index));
  }

  function addLookup() {
    if (lookups.length >= LOOKUP_LIMIT) {
      setErrorText(`Lookups cannot exceed ${LOOKUP_LIMIT} items`);
      return;
    }
    setErrorText('');
    setLookups((current) => [
      ...current,
      { setId: '', setColumn: '', schemaFieldPath: '', matchType: 'exact', threshold: 90 }
    ]);
  }

  function updateLookup(index, field, value) {
    setLookups((current) => {
      return current.map((item, idx) => {
        if (idx !== index) {
          return item;
        }

        const next = { ...item, [field]: value };
        if (field === 'setId') {
          const availableHeaders = headersForSet(value);
          if (next.setColumn && !availableHeaders.includes(next.setColumn)) {
            next.setColumn = '';
          }
        }

        return next;
      });
    });
  }

  function removeLookup(index) {
    setLookups((current) => current.filter((_, idx) => idx !== index));
  }

  async function handleSave() {
    if (!ruleName.trim()) {
      setErrorText('Rule name is required');
      return;
    }

    setIsSaving(true);
    setErrorText('');
    setStatusText('');

    try {
      const sanitizedMapTargets = sanitizeMapTargetsForSave(mapTargets);

      if (isNew) {
        const dataMapRule = await createDataMapRule({
          name: ruleName,
          extractorName,
          mapTargets: sanitizedMapTargets,
          lookups,
          nodeUsages: []
        });
        setStatusText('Data map rule created');
        navigate(`/app/services/data-mapper/rules/${dataMapRule.id}`);
        return;
      }

      await updateDataMapRule(ruleId, {
        name: ruleName,
        extractorName,
        mapTargets: sanitizedMapTargets,
        lookups,
        nodeUsages: []
      });
      setStatusText('Data map rule updated');
    } catch (error) {
      setErrorText(error?.response?.data?.error || 'Failed to save data map rule');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="panel-stack">
      <header className="section-header">
        <div className="section-title-row">
          <Link className="icon-btn-neutral icon-btn-lg" to="/app/services/data-mapper" aria-label="Back to data mapper">
            ←
          </Link>
          <div>
            <h1>{ruleName.trim() || (isNew ? 'New Data Map Rule' : 'Data Map Rule')}</h1>
          </div>
        </div>
        <div className="section-actions">
          <button type="button" className="btn-primary" onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Data Map Rule'}
          </button>
        </div>
      </header>

      {errorText ? <p className="status-error">{errorText}</p> : null}
      {statusText ? <p className="status-ok">{statusText}</p> : null}
      {isLoading ? <p>Loading data map rule...</p> : null}

      {!isLoading ? (
        <>
          <section className="panel">
            <div className="panel-header">
              <div>
                <h2>Rule Basics</h2>
                <p>Select the extractor schema this rule enriches.</p>
              </div>
            </div>
            <div className="form-grid">
              <label htmlFor="data-map-rule-name">Rule name</label>
              <input
                id="data-map-rule-name"
                type="text"
                value={ruleName}
                onChange={(event) => setRuleName(event.target.value)}
              />

              <label htmlFor="data-map-rule-extractor">Extractor</label>
              <select
                id="data-map-rule-extractor"
                value={extractorName}
                onChange={(event) => setExtractorName(event.target.value)}
              >
                <option value="">Select extractor</option>
                {extractors.map((extractor) => (
                  <option key={extractor.id} value={extractor.name}>
                    {extractor.name}
                  </option>
                ))}
              </select>
            </div>
          </section>

          <section className="panel">
            <div className="panel-header">
              <div>
                <h2>Map Targets</h2>
                <p>Choose which schema fields to populate from your data map set.</p>
              </div>
              <button type="button" className="btn btn-outline" onClick={addMapTarget}>
                Add Map Target
              </button>
            </div>

            {mapTargets.length === 0 ? <p>No map targets yet.</p> : null}

            {mapTargets.map((target, index) => (
              <div className="form-grid" key={`map-target-${index}`}>
                <label>Schema field path</label>
                <select
                  value={target.schemaFieldPath || ''}
                  onChange={(event) => updateMapTarget(index, 'schemaFieldPath', event.target.value)}
                >
                  <option value="">
                    {extractorName ? 'Select schema field' : 'Select extractor first'}
                  </option>
                  {withCurrentOption(
                    schemaFieldOptions,
                    target.schemaFieldPath,
                    'Current schema field'
                  ).map((option) => (
                    <option key={`${option.value}-${option.label}`} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>

                <label>Data map set</label>
                <select
                  value={target.setId || ''}
                  onChange={(event) => updateMapTarget(index, 'setId', event.target.value)}
                >
                  <option value="">Select set</option>
                  {setOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>

                <label>Set column</label>
                <select
                  value={target.setColumn || ''}
                  onChange={(event) => updateMapTarget(index, 'setColumn', event.target.value)}
                  disabled={!target.setId}
                >
                  <option value="">Select column</option>
                  {setColumnOptionsForValue(target.setId, target.setColumn).map((header) => (
                    <option key={header} value={header}>
                      {header}
                    </option>
                  ))}
                </select>

                <label>Mode</label>
                <select
                  value={target.mode || 'map'}
                  onChange={(event) => updateMapTarget(index, 'mode', event.target.value)}
                >
                  <option value="map">Map</option>
                  <option value="calculation">Calculation</option>
                </select>

                {target.mode === 'calculation' ? (
                  <>
                    <label>Schema value for calculation</label>
                    <select
                      value={target.calculationSchemaField || ''}
                      onChange={(event) =>
                        updateMapTarget(index, 'calculationSchemaField', event.target.value)
                      }
                    >
                      <option value="">Select schema value</option>
                      {withCurrentOption(
                        schemaFieldOptions,
                        target.calculationSchemaField,
                        'Current schema field'
                      ).map((option) => (
                        <option key={`${option.value}-${option.label}`} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>

                    <label>Operator</label>
                    <select
                      value={target.calculationOperator || '*'}
                      onChange={(event) =>
                        updateMapTarget(index, 'calculationOperator', event.target.value)
                      }
                    >
                      {CALC_OPERATORS.map((operator) => (
                        <option key={operator} value={operator}>
                          {operator}
                        </option>
                      ))}
                    </select>

                    <label>Generated expression</label>
                    <input
                      type="text"
                      value={
                        buildCalculationExpression(
                          target.calculationSchemaField,
                          target.calculationOperator || '*',
                          target.setColumn
                        ) ||
                        target.calculation ||
                        ''
                      }
                      placeholder="schema.total * set.fx"
                      readOnly
                    />
                    <p className="muted-text">
                      Use the builder above to avoid expression typos, e.g. schema.total * set.fx
                    </p>
                  </>
                ) : null}

                <div className="panel-actions">
                  <button type="button" className="btn btn-ghost" onClick={() => removeMapTarget(index)}>
                    Remove Target
                  </button>
                </div>
              </div>
            ))}
          </section>

          <section className="panel">
            <div className="panel-header">
              <div>
                <h2>Lookups</h2>
                <p>Define how the system finds matching rows in the data map set.</p>
              </div>
              <button type="button" className="btn btn-outline" onClick={addLookup}>
                Add Lookup
              </button>
            </div>

            {lookups.length === 0 ? <p>No lookups yet.</p> : null}

            {lookups.map((lookup, index) => (
              <div className="form-grid" key={`lookup-${index}`}>
                <label>Data map set</label>
                <select
                  value={lookup.setId || ''}
                  onChange={(event) => updateLookup(index, 'setId', event.target.value)}
                >
                  <option value="">Select set</option>
                  {setOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>

                <label>Set column</label>
                <select
                  value={lookup.setColumn || ''}
                  onChange={(event) => updateLookup(index, 'setColumn', event.target.value)}
                  disabled={!lookup.setId}
                >
                  <option value="">Select column</option>
                  {setColumnOptionsForValue(lookup.setId, lookup.setColumn).map((header) => (
                    <option key={header} value={header}>
                      {header}
                    </option>
                  ))}
                </select>

                <label>Schema field to match</label>
                <select
                  value={lookup.schemaFieldPath || ''}
                  onChange={(event) => updateLookup(index, 'schemaFieldPath', event.target.value)}
                >
                  <option value="">
                    {extractorName ? 'Select schema field' : 'Select extractor first'}
                  </option>
                  {withCurrentOption(
                    schemaFieldOptions,
                    lookup.schemaFieldPath,
                    'Current schema field'
                  ).map((option) => (
                    <option key={`${option.value}-${option.label}`} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>

                <label>Match type</label>
                <select
                  value={lookup.matchType || 'exact'}
                  onChange={(event) => updateLookup(index, 'matchType', event.target.value)}
                >
                  <option value="exact">Exact match</option>
                  <option value="fuzzy">Fuzzy match</option>
                </select>

                {lookup.matchType === 'fuzzy' ? (
                  <>
                    <label>Match threshold (%)</label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={lookup.threshold ?? 90}
                      onChange={(event) => updateLookup(index, 'threshold', Number(event.target.value))}
                    />
                  </>
                ) : null}

                <div className="panel-actions">
                  <button type="button" className="btn btn-ghost" onClick={() => removeLookup(index)}>
                    Remove Lookup
                  </button>
                </div>
              </div>
            ))}
          </section>

          {!isNew ? (
            <section className="panel">
              <div className="panel-header">
                <div>
                  <h2>Workflow Usage</h2>
                  <p>Jump to the nodes using this data map rule.</p>
                </div>
              </div>
              <UsageList usages={nodeUsages} />
            </section>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
