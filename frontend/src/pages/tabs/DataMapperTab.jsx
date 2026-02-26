import React, { useEffect, useState } from 'react';
import {
  createDataMapRule,
  createDataMapSet,
  deleteDataMapRule,
  deleteDataMapSet,
  listDataMapRules,
  listDataMapSets,
  updateDataMapRule,
  updateDataMapSet
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

export function DataMapperTab() {
  const [activeView, setActiveView] = useState('sets');
  const [sets, setSets] = useState([]);
  const [rules, setRules] = useState([]);
  const [isLoadingSets, setIsLoadingSets] = useState(false);
  const [isLoadingRules, setIsLoadingRules] = useState(false);
  const [errorText, setErrorText] = useState('');

  const [setName, setSetName] = useState('');
  const [headersText, setHeadersText] = useState(EMPTY_ARRAY_TEXT);
  const [recordsText, setRecordsText] = useState(EMPTY_ARRAY_TEXT);
  const [editingSetId, setEditingSetId] = useState(null);

  const [ruleName, setRuleName] = useState('');
  const [extractorName, setExtractorName] = useState('');
  const [mapTargetsText, setMapTargetsText] = useState(EMPTY_ARRAY_TEXT);
  const [lookupsText, setLookupsText] = useState(EMPTY_ARRAY_TEXT);
  const [nodeUsagesText, setNodeUsagesText] = useState(EMPTY_ARRAY_TEXT);
  const [editingRuleId, setEditingRuleId] = useState(null);

  async function loadSets() {
    setIsLoadingSets(true);
    setErrorText('');

    try {
      const data = await listDataMapSets();
      setSets(data);
    } catch (error) {
      setErrorText(error?.response?.data?.error || 'Failed to load data map sets');
    } finally {
      setIsLoadingSets(false);
    }
  }

  async function loadRules() {
    setIsLoadingRules(true);
    setErrorText('');

    try {
      const data = await listDataMapRules();
      setRules(data);
    } catch (error) {
      setErrorText(error?.response?.data?.error || 'Failed to load data map rules');
    } finally {
      setIsLoadingRules(false);
    }
  }

  useEffect(() => {
    loadSets();
    loadRules();
  }, []);

  function resetSetForm() {
    setEditingSetId(null);
    setSetName('');
    setHeadersText(EMPTY_ARRAY_TEXT);
    setRecordsText(EMPTY_ARRAY_TEXT);
  }

  function resetRuleForm() {
    setEditingRuleId(null);
    setRuleName('');
    setExtractorName('');
    setMapTargetsText(EMPTY_ARRAY_TEXT);
    setLookupsText(EMPTY_ARRAY_TEXT);
    setNodeUsagesText(EMPTY_ARRAY_TEXT);
  }

  async function handleSetSubmit() {
    if (!setName.trim()) {
      setErrorText('Data map set name is required');
      return;
    }

    let headers;
    let records;
    try {
      headers = parseArrayJson(headersText, 'Headers');
      records = parseArrayJson(recordsText, 'Records');
    } catch (error) {
      setErrorText(error.message);
      return;
    }

    setErrorText('');

    try {
      if (editingSetId) {
        await updateDataMapSet(editingSetId, {
          name: setName,
          headers,
          records
        });
      } else {
        await createDataMapSet({
          name: setName,
          headers,
          records
        });
      }

      resetSetForm();
      await loadSets();
    } catch (error) {
      setErrorText(error?.response?.data?.error || 'Failed to save data map set');
    }
  }

  async function handleSetDelete(setId) {
    setErrorText('');

    try {
      await deleteDataMapSet(setId);
      await loadSets();
    } catch (error) {
      setErrorText(error?.response?.data?.error || 'Failed to delete data map set');
    }
  }

  function beginSetEdit(dataMapSet) {
    setEditingSetId(dataMapSet.id);
    setSetName(dataMapSet.name);
    setHeadersText(JSON.stringify(dataMapSet.headers || [], null, 2));
    setRecordsText(JSON.stringify(dataMapSet.records || [], null, 2));
  }

  async function handleRuleSubmit() {
    if (!ruleName.trim()) {
      setErrorText('Data map rule name is required');
      return;
    }

    let mapTargets;
    let lookups;
    let nodeUsages;
    try {
      mapTargets = parseArrayJson(mapTargetsText, 'Map targets');
      lookups = parseArrayJson(lookupsText, 'Lookups');
      nodeUsages = parseArrayJson(nodeUsagesText, 'Node usages');
    } catch (error) {
      setErrorText(error.message);
      return;
    }

    setErrorText('');

    try {
      if (editingRuleId) {
        await updateDataMapRule(editingRuleId, {
          name: ruleName,
          extractorName,
          mapTargets,
          lookups,
          nodeUsages
        });
      } else {
        await createDataMapRule({
          name: ruleName,
          extractorName,
          mapTargets,
          lookups,
          nodeUsages
        });
      }

      resetRuleForm();
      await loadRules();
    } catch (error) {
      setErrorText(error?.response?.data?.error || 'Failed to save data map rule');
    }
  }

  async function handleRuleDelete(ruleId) {
    setErrorText('');

    try {
      await deleteDataMapRule(ruleId);
      await loadRules();
    } catch (error) {
      setErrorText(error?.response?.data?.error || 'Failed to delete data map rule');
    }
  }

  function beginRuleEdit(rule) {
    setEditingRuleId(rule.id);
    setRuleName(rule.name);
    setExtractorName(rule.extractorName || '');
    setMapTargetsText(JSON.stringify(rule.mapTargets || [], null, 2));
    setLookupsText(JSON.stringify(rule.lookups || [], null, 2));
    setNodeUsagesText(JSON.stringify(rule.nodeUsages || [], null, 2));
  }

  return (
    <section>
      <h2>Data Mapper</h2>
      <p>Manage data map sets and data map rules used by Data Mapper nodes.</p>

      <button
        type="button"
        onClick={() => setActiveView('sets')}
        aria-pressed={activeView === 'sets'}
      >
        Data Map Sets
      </button>
      <button
        type="button"
        onClick={() => setActiveView('rules')}
        aria-pressed={activeView === 'rules'}
      >
        Data Map Rules
      </button>

      {errorText ? <p>{errorText}</p> : null}

      {activeView === 'sets' ? (
        <div>
          <h3>Data Map Sets</h3>
          <label htmlFor="data-map-set-name">Set name</label>
          <br />
          <input
            id="data-map-set-name"
            type="text"
            value={setName}
            onChange={(event) => setSetName(event.target.value)}
          />
          <br />
          <label htmlFor="data-map-set-headers">Headers (JSON array)</label>
          <br />
          <textarea
            id="data-map-set-headers"
            rows={4}
            value={headersText}
            onChange={(event) => setHeadersText(event.target.value)}
          />
          <br />
          <label htmlFor="data-map-set-records">Records (JSON array)</label>
          <br />
          <textarea
            id="data-map-set-records"
            rows={6}
            value={recordsText}
            onChange={(event) => setRecordsText(event.target.value)}
          />
          <br />
          <button type="button" onClick={handleSetSubmit}>
            {editingSetId ? 'Save Data Map Set' : 'Add Data Map Set'}
          </button>
          {editingSetId ? (
            <button type="button" onClick={resetSetForm}>
              Cancel Edit
            </button>
          ) : null}

          {isLoadingSets ? <p>Loading data map sets...</p> : null}
          {!isLoadingSets && sets.length === 0 ? <p>No data map sets yet.</p> : null}

          <ul>
            {sets.map((dataMapSet) => (
              <li key={dataMapSet.id}>
                <strong>{dataMapSet.name}</strong>
                <p>Headers: {dataMapSet.headers?.length || 0}</p>
                <p>Records: {dataMapSet.records?.length || 0}</p>
                <button type="button" onClick={() => beginSetEdit(dataMapSet)}>
                  Edit
                </button>
                <button type="button" onClick={() => handleSetDelete(dataMapSet.id)}>
                  Delete
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div>
          <h3>Data Map Rules</h3>
          <label htmlFor="data-map-rule-name">Rule name</label>
          <br />
          <input
            id="data-map-rule-name"
            type="text"
            value={ruleName}
            onChange={(event) => setRuleName(event.target.value)}
          />
          <br />
          <label htmlFor="data-map-rule-extractor-name">Extractor name</label>
          <br />
          <input
            id="data-map-rule-extractor-name"
            type="text"
            value={extractorName}
            onChange={(event) => setExtractorName(event.target.value)}
          />
          <br />
          <label htmlFor="data-map-rule-map-targets">Map targets (JSON array)</label>
          <br />
          <textarea
            id="data-map-rule-map-targets"
            rows={5}
            value={mapTargetsText}
            onChange={(event) => setMapTargetsText(event.target.value)}
          />
          <br />
          <label htmlFor="data-map-rule-lookups">Lookups (JSON array)</label>
          <br />
          <textarea
            id="data-map-rule-lookups"
            rows={5}
            value={lookupsText}
            onChange={(event) => setLookupsText(event.target.value)}
          />
          <br />
          <label htmlFor="data-map-rule-node-usages">Node usages (JSON array)</label>
          <br />
          <textarea
            id="data-map-rule-node-usages"
            rows={3}
            value={nodeUsagesText}
            onChange={(event) => setNodeUsagesText(event.target.value)}
          />
          <br />
          <button type="button" onClick={handleRuleSubmit}>
            {editingRuleId ? 'Save Data Map Rule' : 'Add Data Map Rule'}
          </button>
          {editingRuleId ? (
            <button type="button" onClick={resetRuleForm}>
              Cancel Edit
            </button>
          ) : null}

          {isLoadingRules ? <p>Loading data map rules...</p> : null}
          {!isLoadingRules && rules.length === 0 ? <p>No data map rules yet.</p> : null}

          <ul>
            {rules.map((rule) => (
              <li key={rule.id}>
                <strong>{rule.name}</strong>
                <p>Extractor: {rule.extractorName || '(not set)'}</p>
                <p>Map targets: {rule.mapTargets?.length || 0}</p>
                <p>Lookups: {rule.lookups?.length || 0}</p>
                <p>Used by nodes: {rule.nodeUsages?.length || 0}</p>
                <button type="button" onClick={() => beginRuleEdit(rule)}>
                  Edit
                </button>
                <button type="button" onClick={() => handleRuleDelete(rule.id)}>
                  Delete
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
