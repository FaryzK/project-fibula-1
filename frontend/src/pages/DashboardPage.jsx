import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listWorkflows } from '../services/workflowApi';
import {
  listDocumentFolders,
  listExtractors
} from '../services/configServiceNodesApi';
import {
  listDataMapRules,
  listDataMapSets,
  listReconciliationRules
} from '../services/dataMapperReconciliationApi';

export function DashboardPage() {
  const [metrics, setMetrics] = useState({
    workflows: 0,
    extractors: 0,
    extractorHeld: 0,
    documentFolders: 0,
    folderHeld: 0,
    reconciliationRules: 0,
    dataMapSets: 0,
    dataMapRules: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [errorText, setErrorText] = useState('');

  useEffect(() => {
    async function loadMetrics() {
      setIsLoading(true);
      setErrorText('');

      try {
        const [
          workflows,
          extractors,
          folders,
          reconciliationRules,
          dataMapSets,
          dataMapRules
        ] = await Promise.all([
          listWorkflows(),
          listExtractors(),
          listDocumentFolders(),
          listReconciliationRules(),
          listDataMapSets(),
          listDataMapRules()
        ]);

        const extractorHeld = extractors.reduce(
          (total, item) => total + (item.heldDocumentCount || item.heldDocuments?.length || 0),
          0
        );
        const folderHeld = folders.reduce(
          (total, item) => total + (item.heldDocumentCount || item.heldDocuments?.length || 0),
          0
        );

        setMetrics({
          workflows: workflows.length,
          extractors: extractors.length,
          extractorHeld,
          documentFolders: folders.length,
          folderHeld,
          reconciliationRules: reconciliationRules.length,
          dataMapSets: dataMapSets.length,
          dataMapRules: dataMapRules.length
        });
      } catch (error) {
        setErrorText(error?.response?.data?.error || 'Failed to load dashboard metrics');
      } finally {
        setIsLoading(false);
      }
    }

    loadMetrics();
  }, []);

  const hasHeldDocs = metrics.extractorHeld > 0 || metrics.folderHeld > 0;

  return (
    <div className="panel-stack">
      <header className="section-header">
        <div>
          <span className="section-eyebrow">Operations</span>
          <h1>Ops Dashboard</h1>
          <p className="section-subtitle">
            Monitor active services, held documents, and configuration coverage.
          </p>
        </div>
      </header>

      {errorText ? <p className="status-error">{errorText}</p> : null}
      {isLoading ? <p>Loading dashboard metrics...</p> : null}

      {!isLoading ? (
        <>
          <div className="card-grid">
            <div className="card-item">
              <div className="card-title">Active Workflows</div>
              <div className="card-meta">{metrics.workflows} workflows configured</div>
            </div>
            <div className={`card-item ${metrics.extractorHeld ? 'card-warning' : ''}`}>
              <div className="card-title">Extractors</div>
              <div className="card-meta">{metrics.extractors} extractors</div>
              <div className="card-meta">{metrics.extractorHeld} held documents</div>
            </div>
            <div className={`card-item ${metrics.folderHeld ? 'card-warning' : ''}`}>
              <div className="card-title">Document Folders</div>
              <div className="card-meta">{metrics.documentFolders} folders</div>
              <div className="card-meta">{metrics.folderHeld} held documents</div>
            </div>
            <div className="card-item">
              <div className="card-title">Reconciliation</div>
              <div className="card-meta">{metrics.reconciliationRules} rules</div>
            </div>
            <div className="card-item">
              <div className="card-title">Data Mapper</div>
              <div className="card-meta">{metrics.dataMapSets} data map sets</div>
              <div className="card-meta">{metrics.dataMapRules} data map rules</div>
            </div>
          </div>

          <section className="panel">
            <div className="panel-header">
              <div>
                <h2>Next Actions</h2>
                <p>Set up services before building or updating workflows.</p>
              </div>
              {hasHeldDocs ? <span className="tag tag-warning">Held documents need review</span> : null}
            </div>
            <div className="card-grid">
              <div className="card-item">
                <div className="card-title">Extractor Setup</div>
                <div className="card-meta">Define schemas and hold rules first.</div>
                <div className="panel-actions">
                  <Link className="btn btn-outline" to="/app/services/extractors">
                    Go to Extractors
                  </Link>
                </div>
              </div>
              <div className="card-item">
                <div className="card-title">Data Mapper</div>
                <div className="card-meta">Create lookup sets and enrichment rules.</div>
                <div className="panel-actions">
                  <Link className="btn btn-outline" to="/app/services/data-mapper">
                    Go to Data Mapper
                  </Link>
                </div>
              </div>
              <div className="card-item">
                <div className="card-title">Reconciliation</div>
                <div className="card-meta">Build matching rules before adding the node.</div>
                <div className="panel-actions">
                  <Link className="btn btn-outline" to="/app/services/reconciliation">
                    Go to Reconciliation
                  </Link>
                </div>
              </div>
              <div className="card-item">
                <div className="card-title">Workflow Build</div>
                <div className="card-meta">Connect your configured services on the canvas.</div>
                <div className="panel-actions">
                  <Link className="btn btn-outline" to="/app/workflows">
                    Go to Workflows
                  </Link>
                </div>
              </div>
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}
