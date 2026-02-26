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
  const [heldDocuments, setHeldDocuments] = useState([]);
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
        const extractorHeldDocs = extractors.flatMap((extractor) =>
          (extractor.heldDocuments || []).map((held, index) => ({
            id: held.document?.id || `${extractor.id}-${index}`,
            documentName: held.document?.fileName || held.document?.id || 'Document',
            sourceType: 'Extractor',
            sourceName: extractor.name || 'Extractor',
            sourceLink: `/app/services/extractors/${extractor.id}`,
            workflowId: held.workflowId,
            workflowName: held.workflowName,
            nodeId: held.nodeId,
            nodeName: held.nodeName,
            arrivedAt: held.arrivedAt
          }))
        );
        const folderHeldDocs = folders.flatMap((folder) =>
          (folder.heldDocuments || []).map((held, index) => ({
            id: held.document?.id || `${folder.id}-${index}`,
            documentName: held.document?.fileName || held.document?.id || 'Document',
            sourceType: 'Folder',
            sourceName: folder.name || 'Document Folder',
            sourceLink: `/app/services/document-folders/${folder.id}`,
            workflowId: held.workflowId,
            workflowName: held.workflowName,
            nodeId: held.nodeId,
            nodeName: held.nodeName,
            arrivedAt: held.arrivedAt
          }))
        );
        const combinedHeld = [...extractorHeldDocs, ...folderHeldDocs].sort((a, b) => {
          const left = new Date(a.arrivedAt || 0).getTime();
          const right = new Date(b.arrivedAt || 0).getTime();
          return right - left;
        });
        setHeldDocuments(combinedHeld.slice(0, 6));
      } catch (error) {
        setErrorText(error?.response?.data?.error || 'Failed to load dashboard metrics');
      } finally {
        setIsLoading(false);
      }
    }

    loadMetrics();
  }, []);

  const hasHeldDocs = metrics.extractorHeld > 0 || metrics.folderHeld > 0;
  const journeySteps = [
    {
      key: 'extractors',
      title: 'Define Extractors',
      description: 'Set schema, table types, and hold rules.',
      count: metrics.extractors,
      link: '/app/services/extractors'
    },
    {
      key: 'data-map-sets',
      title: 'Build Data Map Sets',
      description: 'Upload lookup tables for enrichment.',
      count: metrics.dataMapSets,
      link: '/app/services/data-mapper'
    },
    {
      key: 'data-map-rules',
      title: 'Create Data Map Rules',
      description: 'Map fields and configure lookups.',
      count: metrics.dataMapRules,
      link: '/app/services/data-mapper'
    },
    {
      key: 'reconciliation',
      title: 'Set Reconciliation Rules',
      description: 'Define matching and tolerances.',
      count: metrics.reconciliationRules,
      link: '/app/services/reconciliation'
    },
    {
      key: 'folders',
      title: 'Create Review Folders',
      description: 'Route documents needing ops review.',
      count: metrics.documentFolders,
      link: '/app/services/document-folders'
    },
    {
      key: 'workflows',
      title: 'Build Workflows',
      description: 'Connect services on the canvas.',
      count: metrics.workflows,
      link: '/app/workflows'
    }
  ];
  const journeyComplete = journeySteps.filter((step) => step.count > 0).length;
  const journeyTotal = journeySteps.length;
  const heldCount = metrics.extractorHeld + metrics.folderHeld;
  const formatTimestamp = (value) => {
    if (!value) {
      return 'Unknown';
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return 'Unknown';
    }
    return parsed.toLocaleString();
  };

  return (
    <div className="panel-stack">
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

          <div className="dashboard-grid">
            <section className="panel">
              <div className="panel-header">
                <div>
                  <h2>Setup Journey</h2>
                  <p>Complete the core service setup before publishing workflows.</p>
                </div>
                <span className="tag">{journeyComplete}/{journeyTotal} complete</span>
              </div>
              <div className="journey-list">
                {journeySteps.map((step, index) => (
                  <div
                    className={`journey-step ${step.count > 0 ? 'ready' : ''}`}
                    key={step.key}
                  >
                    <div className="journey-index">{index + 1}</div>
                    <div className="journey-body">
                      <div className="journey-title">{step.title}</div>
                      <div className="journey-meta">{step.description}</div>
                    </div>
                    <div className="journey-actions">
                      <span className={`tag ${step.count > 0 ? 'tag-accent' : ''}`}>
                        {step.count > 0 ? 'Ready' : 'Not started'}
                      </span>
                      <Link className="btn btn-outline" to={step.link}>
                        Open
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="panel">
              <div className="panel-header">
                <div>
                  <h2>Live Holds</h2>
                  <p>Documents awaiting manual review or release.</p>
                </div>
                {hasHeldDocs ? <span className="tag tag-warning">{heldCount} held</span> : null}
              </div>
              {heldDocuments.length === 0 ? (
                <p className="muted-text">No held documents right now.</p>
              ) : (
                <div className="data-table">
                  <div className="data-header four-col">
                    <span>Document</span>
                    <span>Source</span>
                    <span>Workflow</span>
                    <span>Arrived</span>
                  </div>
                  {heldDocuments.map((item) => (
                    <div className="data-row four-col" key={item.id}>
                      <div className="data-cell">
                        <span className="card-title">{item.documentName}</span>
                        <span className="data-meta">{item.sourceType}</span>
                      </div>
                      <div className="data-cell">
                        <Link className="btn btn-ghost" to={item.sourceLink}>
                          {item.sourceName}
                        </Link>
                      </div>
                      <div className="data-cell">
                        {item.workflowId ? (
                          <Link
                            className="btn btn-ghost"
                            to={`/app/workflows/${item.workflowId}/canvas?nodeId=${item.nodeId}`}
                          >
                            {item.workflowName || 'Workflow'} · {item.nodeName || 'Node'}
                          </Link>
                        ) : (
                          <span className="data-meta">Workflow pending</span>
                        )}
                      </div>
                      <div className="data-cell">
                        <span className="data-meta">{formatTimestamp(item.arrivedAt)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </>
      ) : null}
    </div>
  );
}
