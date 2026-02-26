import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listDataMapRules, listDataMapSets } from '../../services/dataMapperReconciliationApi';

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
          <div className="service-list">
            {sets.map((dataMapSet) => (
              <div className="service-row" key={dataMapSet.id}>
                <div className="card-title">{dataMapSet.name || 'Untitled Data Map Set'}</div>
                <Link
                  className="icon-btn-neutral"
                  to={`/app/services/data-mapper/sets/${dataMapSet.id}`}
                  aria-label="Edit data map set"
                >
                  ✎
                </Link>
              </div>
            ))}
          </div>
        )
      ) : null}

      {!isLoading && activeView === 'rules' ? (
        rules.length === 0 ? (
          <p>No data map rules yet.</p>
        ) : (
          <div className="service-list">
            {rules.map((rule) => (
              <div className="service-row" key={rule.id}>
                <div className="card-title">{rule.name || 'Untitled Data Map Rule'}</div>
                <Link
                  className="icon-btn-neutral"
                  to={`/app/services/data-mapper/rules/${rule.id}`}
                  aria-label="Edit data map rule"
                >
                  ✎
                </Link>
              </div>
            ))}
          </div>
        )
      ) : null}
    </div>
  );
}
