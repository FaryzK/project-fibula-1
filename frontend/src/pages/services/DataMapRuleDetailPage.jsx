import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  createDataMapRule,
  listDataMapRules,
  listDataMapSets,
  updateDataMapRule
} from '../../services/dataMapperReconciliationApi';
import { listExtractors } from '../../services/configServiceNodesApi';

const LOOKUP_LIMIT = 7;

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
          setMapTargets(found.mapTargets || []);
          setLookups(found.lookups || []);
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
    () => dataMapSets.map((set) => ({ value: set.id, label: set.name, headers: set.headers || [] })),
    [dataMapSets]
  );

  function headersForSet(setId) {
    return setOptions.find((option) => option.value === setId)?.headers || [];
  }

  function addMapTarget() {
    setMapTargets((current) => [
      ...current,
      { schemaFieldPath: '', setId: '', setColumn: '', mode: 'map', calculation: '' }
    ]);
  }

  function updateMapTarget(index, field, value) {
    setMapTargets((current) =>
      current.map((item, idx) => (idx === index ? { ...item, [field]: value } : item))
    );
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
    setLookups((current) =>
      current.map((item, idx) => (idx === index ? { ...item, [field]: value } : item))
    );
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
      if (isNew) {
        const dataMapRule = await createDataMapRule({
          name: ruleName,
          extractorName,
          mapTargets,
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
        mapTargets,
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
        <div>
          <span className="section-eyebrow">Service Setup</span>
          <h1>{isNew ? 'New Data Map Rule' : 'Data Map Rule'}</h1>
          <p className="section-subtitle">Define how extracted fields are enriched using lookup sets.</p>
        </div>
        <div className="section-actions">
          <Link className="btn btn-ghost" to="/app/services/data-mapper">
            Back to Data Mapper
          </Link>
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
                <input
                  type="text"
                  value={target.schemaFieldPath || ''}
                  onChange={(event) => updateMapTarget(index, 'schemaFieldPath', event.target.value)}
                  placeholder="vendor.code"
                />

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
                  {headersForSet(target.setId).map((header) => (
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
                    <label>Calculation expression</label>
                    <input
                      type="text"
                      value={target.calculation || ''}
                      onChange={(event) => updateMapTarget(index, 'calculation', event.target.value)}
                      placeholder="quantity * conversion"
                    />
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
                  {headersForSet(lookup.setId).map((header) => (
                    <option key={header} value={header}>
                      {header}
                    </option>
                  ))}
                </select>

                <label>Schema field to match</label>
                <input
                  type="text"
                  value={lookup.schemaFieldPath || ''}
                  onChange={(event) => updateLookup(index, 'schemaFieldPath', event.target.value)}
                  placeholder="vendor.name"
                />

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
        </>
      ) : null}
    </div>
  );
}
