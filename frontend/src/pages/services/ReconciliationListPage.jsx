import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { deleteReconciliationRule, listReconciliationRules } from '../../services/dataMapperReconciliationApi';

export function ReconciliationListPage() {
  const [rules, setRules] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorText, setErrorText] = useState('');

  async function loadRules() {
    setIsLoading(true);
    setErrorText('');

    try {
      const data = await listReconciliationRules();
      setRules(data);
    } catch (error) {
      setErrorText(error?.response?.data?.error || 'Failed to load reconciliation rules');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadRules();
  }, []);

  async function handleDelete(ruleId) {
    setErrorText('');

    try {
      await deleteReconciliationRule(ruleId);
      await loadRules();
    } catch (error) {
      setErrorText(error?.response?.data?.error || 'Failed to delete reconciliation rule');
    }
  }

  return (
    <div className="panel-stack">
      <header className="section-header">
        <div>
          <span className="section-eyebrow">Services</span>
          <h1>Reconciliation</h1>
          <p className="section-subtitle">Define matching logic and monitor reconciliation outcomes.</p>
        </div>
        <div className="section-actions">
          <Link className="btn btn-primary" to="/app/services/reconciliation/new">
            New Reconciliation Rule
          </Link>
        </div>
      </header>

      {errorText ? <p className="status-error">{errorText}</p> : null}
      {isLoading ? <p>Loading reconciliation rules...</p> : null}
      {!isLoading && rules.length === 0 ? <p>No reconciliation rules yet.</p> : null}

      {!isLoading && rules.length > 0 ? (
        <div className="card-grid">
          {rules.map((rule) => (
            <div className="card-item" key={rule.id}>
              <div className="card-title">{rule.name}</div>
              <div className="card-meta">Anchor: {rule.anchorExtractor || '(not set)'}</div>
              <div className="card-meta">Targets: {rule.targetExtractors?.length || 0}</div>
              <div className="card-meta">Variations: {rule.variations?.length || 0}</div>
              <div className="panel-actions">
                <Link className="btn btn-outline" to={`/app/services/reconciliation/${rule.id}`}>
                  Manage
                </Link>
                <button type="button" className="btn-danger" onClick={() => handleDelete(rule.id)}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
