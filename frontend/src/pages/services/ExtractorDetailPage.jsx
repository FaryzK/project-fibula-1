import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  createExtractor,
  listExtractors,
  updateExtractor
} from '../../services/configServiceNodesApi';
import { UsageList } from '../../components/UsageList';

const DEFAULT_SCHEMA = {
  headerFields: [],
  tableTypes: []
};

const STEPS = [
  { key: 'basics', label: 'Basics', description: 'Name the extractor and describe its intent.' },
  { key: 'schema', label: 'Schema', description: 'Define header fields and table structures.' },
  { key: 'hold', label: 'Hold Rules', description: 'Set mandatory fields and hold behavior.' }
];

export function ExtractorDetailPage() {
  const { extractorId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const isNew = !extractorId;

  const [activeStep, setActiveStep] = useState(STEPS[0].key);
  const [name, setName] = useState('');
  const [schema, setSchema] = useState(DEFAULT_SCHEMA);
  const [holdAllDocuments, setHoldAllDocuments] = useState(false);
  const [extractorMeta, setExtractorMeta] = useState(null);
  const [isLoading, setIsLoading] = useState(!isNew);
  const [isSaving, setIsSaving] = useState(false);
  const [errorText, setErrorText] = useState('');
  const [statusText, setStatusText] = useState('');

  useEffect(() => {
    if (isNew) {
      return;
    }

    async function loadExtractor() {
      setIsLoading(true);
      setErrorText('');

      try {
        const data = await listExtractors();
        const found = data.find((item) => item.id === extractorId);

        if (!found) {
          setErrorText('Extractor not found');
          return;
        }

        setExtractorMeta(found);
        setName(found.name || '');
        setSchema(found.schema || DEFAULT_SCHEMA);
        setHoldAllDocuments(Boolean(found.holdAllDocuments));
      } catch (error) {
        setErrorText(error?.response?.data?.error || 'Failed to load extractor');
      } finally {
        setIsLoading(false);
      }
    }

    loadExtractor();
  }, [extractorId, isNew]);

  const activeIndex = useMemo(
    () => STEPS.findIndex((step) => step.key === activeStep),
    [activeStep]
  );

  function updateHeaderField(index, field, value) {
    setSchema((previous) => {
      const next = [...(previous.headerFields || [])];
      next[index] = { ...next[index], [field]: value };
      return { ...previous, headerFields: next };
    });
  }

  function reorderList(list, fromIndex, toIndex) {
    if (fromIndex === toIndex) {
      return list;
    }
    const next = [...list];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    return next;
  }

  function setDragPayload(event, payload) {
    event.dataTransfer.setData('application/json', JSON.stringify(payload));
    event.dataTransfer.effectAllowed = 'move';
  }

  function getDragPayload(event) {
    const raw = event.dataTransfer.getData('application/json');
    if (!raw) {
      return null;
    }
    try {
      return JSON.parse(raw);
    } catch (_error) {
      return null;
    }
  }

  function addHeaderField() {
    setSchema((previous) => ({
      ...previous,
      headerFields: [
        ...(previous.headerFields || []),
        { fieldName: '', description: '', required: false }
      ]
    }));
  }

  function removeHeaderField(index) {
    setSchema((previous) => ({
      ...previous,
      headerFields: (previous.headerFields || []).filter((_, idx) => idx !== index)
    }));
  }

  function handleHeaderDrop(event, targetIndex) {
    event.preventDefault();
    const payload = getDragPayload(event);
    if (!payload || payload.type !== 'header') {
      return;
    }
    setSchema((previous) => ({
      ...previous,
      headerFields: reorderList(previous.headerFields || [], payload.index, targetIndex)
    }));
  }

  function updateTableType(index, field, value) {
    setSchema((previous) => {
      const next = [...(previous.tableTypes || [])];
      next[index] = { ...next[index], [field]: value };
      return { ...previous, tableTypes: next };
    });
  }

  function addTableType() {
    setSchema((previous) => ({
      ...previous,
      tableTypes: [
        ...(previous.tableTypes || []),
        {
          tableName: '',
          description: '',
          required: false,
          columns: [{ columnName: '', description: '' }]
        }
      ]
    }));
  }

  function removeTableType(index) {
    setSchema((previous) => ({
      ...previous,
      tableTypes: (previous.tableTypes || []).filter((_, idx) => idx !== index)
    }));
  }

  function handleTableDrop(event, targetIndex) {
    event.preventDefault();
    const payload = getDragPayload(event);
    if (!payload || payload.type !== 'table') {
      return;
    }
    setSchema((previous) => ({
      ...previous,
      tableTypes: reorderList(previous.tableTypes || [], payload.index, targetIndex)
    }));
  }

  function updateColumn(tableIndex, columnIndex, field, value) {
    setSchema((previous) => {
      const tableTypes = [...(previous.tableTypes || [])];
      const table = { ...tableTypes[tableIndex] };
      const columns = [...(table.columns || [])];
      columns[columnIndex] = { ...columns[columnIndex], [field]: value };
      table.columns = columns;
      tableTypes[tableIndex] = table;
      return { ...previous, tableTypes };
    });
  }

  function addColumn(tableIndex) {
    setSchema((previous) => {
      const tableTypes = [...(previous.tableTypes || [])];
      const table = { ...tableTypes[tableIndex] };
      table.columns = [...(table.columns || []), { columnName: '', description: '' }];
      tableTypes[tableIndex] = table;
      return { ...previous, tableTypes };
    });
  }

  function removeColumn(tableIndex, columnIndex) {
    setSchema((previous) => {
      const tableTypes = [...(previous.tableTypes || [])];
      const table = { ...tableTypes[tableIndex] };
      table.columns = (table.columns || []).filter((_, idx) => idx !== columnIndex);
      tableTypes[tableIndex] = table;
      return { ...previous, tableTypes };
    });
  }

  function handleColumnDrop(event, tableIndex, targetIndex) {
    event.preventDefault();
    const payload = getDragPayload(event);
    if (!payload || payload.type !== 'column' || payload.tableIndex !== tableIndex) {
      return;
    }
    setSchema((previous) => {
      const tableTypes = [...(previous.tableTypes || [])];
      const table = { ...tableTypes[tableIndex] };
      table.columns = reorderList(table.columns || [], payload.index, targetIndex);
      tableTypes[tableIndex] = table;
      return { ...previous, tableTypes };
    });
  }

  async function handleSave() {
    if (!name.trim()) {
      setErrorText('Extractor name is required');
      return;
    }

    setIsSaving(true);
    setErrorText('');
    setStatusText('');

    try {
      if (isNew) {
        const extractor = await createExtractor({
          name,
          schema,
          holdAllDocuments
        });
        setStatusText('Extractor created');
        const params = new URLSearchParams(location.search);
        const returnTo = params.get('returnTo');
        const returnNodeId = params.get('nodeId');

        if (returnTo && returnNodeId) {
          navigate(`${returnTo}?nodeId=${returnNodeId}&assignExtractorId=${extractor.id}`);
          return;
        }

        navigate(`/app/services/extractors/${extractor.id}`);
        return;
      }

      const extractor = await updateExtractor(extractorId, {
        name,
        schema,
        holdAllDocuments
      });
      setExtractorMeta(extractor);
      setStatusText('Extractor updated');
    } catch (error) {
      setErrorText(error?.response?.data?.error || 'Failed to save extractor');
    } finally {
      setIsSaving(false);
    }
  }

  function nextStep() {
    const nextIndex = Math.min(activeIndex + 1, STEPS.length - 1);
    setActiveStep(STEPS[nextIndex].key);
  }

  function previousStep() {
    const nextIndex = Math.max(activeIndex - 1, 0);
    setActiveStep(STEPS[nextIndex].key);
  }

  const requiredHeaderCount = (schema.headerFields || []).filter((item) => item.required).length;
  const requiredTableCount = (schema.tableTypes || []).filter((item) => item.required).length;
  const heldDocuments = extractorMeta?.heldDocuments || [];
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
      <header className="section-header">
        <div>
          <span className="section-eyebrow">Service Setup</span>
          <h1>{isNew ? 'New Extractor' : 'Extractor Setup'}</h1>
          <p className="section-subtitle">
            Define schema and extraction rules before attaching this extractor to a workflow.
          </p>
        </div>
        <div className="section-actions">
          <Link className="btn btn-ghost" to="/app/services/extractors">
            Back to Extractors
          </Link>
          <button type="button" className="btn-primary" onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Extractor'}
          </button>
        </div>
      </header>

      {errorText ? <p className="status-error">{errorText}</p> : null}
      {statusText ? <p className="status-ok">{statusText}</p> : null}
      {isLoading ? <p>Loading extractor...</p> : null}

      {!isLoading ? (
        <>
          <div className="stepper">
            {STEPS.map((step, index) => (
              <button
                key={step.key}
                type="button"
                className={`stepper-item ${activeStep === step.key ? 'active' : ''} ${
                  index < activeIndex ? 'complete' : ''
                }`}
                onClick={() => setActiveStep(step.key)}
              >
                <span className="stepper-index">{index + 1}</span>
                <span>
                  <span className="stepper-title">{step.label}</span>
                  <span className="stepper-meta">{step.description}</span>
                </span>
              </button>
            ))}
          </div>

          {activeStep === 'basics' ? (
            <section className="panel">
              <div className="panel-header">
                <div>
                  <h2>Extractor Basics</h2>
                  <p>Name the extractor and clarify its intended document type.</p>
                </div>
              </div>
              <div className="form-grid">
                <label htmlFor="extractor-name">Extractor name</label>
                <input
                  id="extractor-name"
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="e.g. Invoice Extractor"
                />
              </div>
            </section>
          ) : null}

          {activeStep === 'schema' ? (
            <div className="panel-stack">
              <section className="panel">
                <div className="panel-header">
                  <div>
                    <h2>Header Fields</h2>
                    <p>Define the fields extracted from the document header.</p>
                  </div>
                  <button type="button" className="btn btn-outline" onClick={addHeaderField}>
                    Add Field
                  </button>
                </div>

                {(schema.headerFields || []).length === 0 ? <p>No header fields yet.</p> : null}

                {(schema.headerFields || []).map((field, index) => (
                  <div
                    className="field-row"
                    key={`header-${index}`}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => handleHeaderDrop(event, index)}
                  >
                    <button
                      type="button"
                      className="drag-handle"
                      draggable
                      onDragStart={(event) => setDragPayload(event, { type: 'header', index })}
                      aria-label="Reorder header field"
                    >
                      ⋮⋮
                    </button>
                    <div className="field-inputs">
                      <input
                        type="text"
                        value={field.fieldName || ''}
                        onChange={(event) => updateHeaderField(index, 'fieldName', event.target.value)}
                        placeholder="Field name"
                        aria-label="Field name"
                      />
                      <input
                        type="text"
                        value={field.description || ''}
                        onChange={(event) => updateHeaderField(index, 'description', event.target.value)}
                        placeholder="Description"
                        aria-label="Field description"
                      />
                    </div>
                    <label className="toggle">
                      <input
                        type="checkbox"
                        checked={Boolean(field.required)}
                        onChange={(event) => updateHeaderField(index, 'required', event.target.checked)}
                      />
                      <span className="toggle-track" />
                      <span className="toggle-label">Required</span>
                    </label>
                    <button
                      type="button"
                      className="icon-btn"
                      onClick={() => removeHeaderField(index)}
                      aria-label="Remove field"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </section>

              <section className="panel">
                <div className="panel-header">
                  <div>
                    <h2>Table Types</h2>
                    <p>Define line item tables that should be extracted.</p>
                  </div>
                  <button type="button" className="btn btn-outline" onClick={addTableType}>
                    Add Table Type
                  </button>
                </div>

                {(schema.tableTypes || []).length === 0 ? <p>No table types yet.</p> : null}

                {(schema.tableTypes || []).map((table, index) => (
                  <div
                    className="panel"
                    key={`table-${index}`}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => handleTableDrop(event, index)}
                  >
                    <div className="table-type-header">
                      <button
                        type="button"
                        className="drag-handle"
                        draggable
                        onDragStart={(event) => setDragPayload(event, { type: 'table', index })}
                        aria-label="Reorder table type"
                      >
                        ⋮⋮
                      </button>
                      <div className="field-inputs">
                        <input
                          type="text"
                          value={table.tableName || ''}
                          onChange={(event) => updateTableType(index, 'tableName', event.target.value)}
                          placeholder="Table name"
                          aria-label="Table name"
                        />
                        <input
                          type="text"
                          value={table.description || ''}
                          onChange={(event) => updateTableType(index, 'description', event.target.value)}
                          placeholder="Description"
                          aria-label="Table description"
                        />
                      </div>
                      <label className="toggle">
                        <input
                          type="checkbox"
                          checked={Boolean(table.required)}
                          onChange={(event) => updateTableType(index, 'required', event.target.checked)}
                        />
                        <span className="toggle-track" />
                        <span className="toggle-label">Required</span>
                      </label>
                      <button
                        type="button"
                        className="icon-btn"
                        onClick={() => removeTableType(index)}
                        aria-label="Remove table"
                      >
                        ×
                      </button>
                    </div>

                    <div className="panel-actions align-right">
                      <button type="button" className="btn btn-outline" onClick={() => addColumn(index)}>
                        Add Column
                      </button>
                    </div>

                    {(table.columns || []).map((column, columnIndex) => (
                      <div
                        className="field-row"
                        key={`table-${index}-column-${columnIndex}`}
                        onDragOver={(event) => event.preventDefault()}
                        onDrop={(event) => handleColumnDrop(event, index, columnIndex)}
                      >
                        <button
                          type="button"
                          className="drag-handle"
                          draggable
                          onDragStart={(event) =>
                            setDragPayload(event, { type: 'column', tableIndex: index, index: columnIndex })
                          }
                          aria-label="Reorder column"
                        >
                          ⋮⋮
                        </button>
                        <div className="field-inputs">
                          <input
                            type="text"
                            value={column.columnName || ''}
                            onChange={(event) =>
                              updateColumn(index, columnIndex, 'columnName', event.target.value)
                            }
                            placeholder="Column name"
                            aria-label="Column name"
                          />
                          <input
                            type="text"
                            value={column.description || ''}
                            onChange={(event) =>
                              updateColumn(index, columnIndex, 'description', event.target.value)
                            }
                            placeholder="Description"
                            aria-label="Column description"
                          />
                        </div>
                        <div />
                        <button
                          type="button"
                          className="icon-btn"
                          onClick={() => removeColumn(index, columnIndex)}
                          aria-label="Remove column"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                ))}
              </section>
            </div>
          ) : null}

          {activeStep === 'hold' ? (
            <section className="panel">
              <div className="panel-header">
                <div>
                  <h2>Hold Rules</h2>
                  <p>Control which documents are held for manual review.</p>
                </div>
              </div>

              <div className="form-grid">
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={holdAllDocuments}
                    onChange={(event) => setHoldAllDocuments(event.target.checked)}
                  />
                  <span className="toggle-track" />
                  <span className="toggle-label">Hold all documents in this extractor</span>
                </label>
              </div>

              <div className="card-grid">
                <div className="card-item">
                  <div className="card-title">Required Header Fields</div>
                  <div className="card-meta">{requiredHeaderCount} fields marked required</div>
                </div>
                <div className="card-item">
                  <div className="card-title">Required Tables</div>
                  <div className="card-meta">{requiredTableCount} tables marked required</div>
                </div>
                {extractorMeta ? (
                  <div className="card-item">
                    <div className="card-title">Held Documents</div>
                    <div className="card-meta">
                      {extractorMeta.heldDocumentCount || extractorMeta.heldDocuments?.length || 0}
                    </div>
                  </div>
                ) : null}
              </div>
            </section>
          ) : null}

          <div className="panel-actions">
            <button type="button" className="btn btn-ghost" onClick={previousStep} disabled={activeIndex === 0}>
              Back
            </button>
            <button type="button" className="btn btn-outline" onClick={nextStep} disabled={activeIndex === STEPS.length - 1}>
              Next
            </button>
          </div>

          {extractorMeta ? (
            <div className="panel-grid">
              <section className="panel">
                <div className="panel-header">
                  <div>
                    <h2>Held Documents</h2>
                    <p>Documents waiting for operator review.</p>
                  </div>
                </div>
                {heldDocuments.length === 0 ? (
                  <p className="muted-text">No held documents for this extractor.</p>
                ) : (
                  <div className="data-table">
                    <div className="data-header four-col">
                      <span>Document</span>
                      <span>Workflow</span>
                      <span>Node</span>
                      <span>Arrived</span>
                    </div>
                    {heldDocuments.map((item, index) => (
                      <div className="data-row four-col" key={item.document?.id || `${index}`}>
                        <div className="data-cell">
                          <span className="card-title">
                            {item.document?.fileName || item.document?.id || 'Document'}
                          </span>
                          <span className="data-meta">{item.document?.id || 'No ID'}</span>
                        </div>
                        <div className="data-cell">
                          {item.workflowId ? (
                            <Link
                              className="btn btn-ghost"
                              to={`/app/workflows/${item.workflowId}/canvas?nodeId=${item.nodeId}`}
                            >
                              {item.workflowName || 'Workflow'}
                            </Link>
                          ) : (
                            <span className="data-meta">Workflow pending</span>
                          )}
                        </div>
                        <div className="data-cell">
                          <span className="data-meta">{item.nodeName || 'Node'}</span>
                        </div>
                        <div className="data-cell">
                          <span className="data-meta">{formatTimestamp(item.arrivedAt)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className="panel">
                <div className="panel-header">
                  <div>
                    <h2>Workflow Usage</h2>
                    <p>Jump to the nodes using this extractor.</p>
                  </div>
                </div>
                <UsageList usages={extractorMeta.nodeUsages || []} />
              </section>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
