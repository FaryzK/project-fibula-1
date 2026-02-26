import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listDataMapRules, listDataMapSets, deleteDataMapRule, deleteDataMapSet } from '../../services/dataMapperReconciliationApi';

export function DataMapperListPage() {
  const [activeView, setActiveView] = useState('sets');
  const [sets, setSets] = useState([]);
  const [rules, setRules] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorText, setErrorText] = useState('');

  async function loadData() {
    setIsLoading(true);
    setErrorText('');

    try {
      const [setsData, rulesData] = await Promise.all([listDataMapSets(), listDataMapRules()]);
      setSets(setsData);
      setRules(rulesData);
    } catch (error) {
      setErrorText(error?.response?.data?.error || 'Failed to load data mapper');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleDeleteSet(setId) {
    setErrorText('');

    try {
      await deleteDataMapSet(setId);
      await loadData();
    } catch (error) {
      setErrorText(error?.response?.data?.error || 'Failed to delete data map set');
    }
  }

  async function handleDeleteRule(ruleId) {
    setErrorText('');

    try {
      await deleteDataMapRule(ruleId);
      await loadData();
    } catch (error) {
      setErrorText(error?.response?.data?.error || 'Failed to delete data map rule');
    }
  }

  return (
    <div className="panel-stack">
      <header className="section-header">
        <div>
          <span className="section-eyebrow">Services</span>
          <h1>Data Mapper</h1>
          <p className="section-subtitle">Maintain data map sets and enrichment rules.</p>
        </div>
        <div className="section-actions">
          {activeView === 'sets' ? (
            <Link className="btn btn-primary" to="/app/services/data-mapper/sets/new">
              New Data Map Set
            </Link>
          ) : (
            <Link className="btn btn-primary" to="/app/services/data-mapper/rules/new">
              New Data Map Rule
            </Link>
          )}
        </div>
      </header>

      <div className="segmented-control" role="tablist">
        <button type="button" onClick={() => setActiveView('sets')} aria-pressed={activeView === 'sets'}>
          Data Map Sets
        </button>
        <button type="button" onClick={() => setActiveView('rules')} aria-pressed={activeView === 'rules'}>
          Data Map Rules
        </button>
      </div>

      {errorText ? <p className="status-error">{errorText}</p> : null}
      {isLoading ? <p>Loading data mapper...</p> : null}

      {!isLoading && activeView === 'sets' ? (
        sets.length === 0 ? (
          <p>No data map sets yet.</p>
        ) : (
          <div className="card-grid">
            {sets.map((dataMapSet) => (
              <div className="card-item" key={dataMapSet.id}>
                <div className="card-title">{dataMapSet.name}</div>
                <div className="card-meta">Headers: {dataMapSet.headers?.length || 0}</div>
                <div className="card-meta">Records: {dataMapSet.records?.length || 0}</div>
                <div className="panel-actions">
                  <Link className="btn btn-outline" to={`/app/services/data-mapper/sets/${dataMapSet.id}`}>
                    Manage
                  </Link>
                  <button type="button" className="btn-danger" onClick={() => handleDeleteSet(dataMapSet.id)}>
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : null}

      {!isLoading && activeView === 'rules' ? (
        rules.length === 0 ? (
          <p>No data map rules yet.</p>
        ) : (
          <div className="card-grid">
            {rules.map((rule) => (
              <div className="card-item" key={rule.id}>
                <div className="card-title">{rule.name}</div>
                <div className="card-meta">Extractor: {rule.extractorName || '(not set)'}</div>
                <div className="card-meta">Map targets: {rule.mapTargets?.length || 0}</div>
                <div className="card-meta">Lookups: {rule.lookups?.length || 0}</div>
                <div className="panel-actions">
                  <Link className="btn btn-outline" to={`/app/services/data-mapper/rules/${rule.id}`}>
                    Manage
                  </Link>
                  <button type="button" className="btn-danger" onClick={() => handleDeleteRule(rule.id)}>
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : null}
    </div>
  );
}
