import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  addExtractorFeedback,
  createExtractor,
  deleteExtractorFeedback,
  listExtractors,
  sendOutFromExtractor,
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
  const emptyArray = useMemo(() => [], []);

  const [activeStep, setActiveStep] = useState(STEPS[0].key);
  const [name, setName] = useState('');
  const [schema, setSchema] = useState(DEFAULT_SCHEMA);
  const [holdAllDocuments, setHoldAllDocuments] = useState(false);
  const [extractorMeta, setExtractorMeta] = useState(null);
  const [isLoading, setIsLoading] = useState(!isNew);
  const [isSaving, setIsSaving] = useState(false);
  const [errorText, setErrorText] = useState('');
  const [statusText, setStatusText] = useState('');
  const [activeTab, setActiveTab] = useState('schema');
  const [feedbacks, setFeedbacks] = useState([]);
  const [feedbackDocumentId, setFeedbackDocumentId] = useState('');
  const [feedbackTargetType, setFeedbackTargetType] = useState('header');
  const [feedbackTargetPath, setFeedbackTargetPath] = useState('');
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackStatus, setFeedbackStatus] = useState('');
  const [feedbackError, setFeedbackError] = useState('');
  const [selectedHeldDocs, setSelectedHeldDocs] = useState([]);

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
        setFeedbacks(found.feedbacks || []);
      } catch (error) {
        setErrorText(error?.response?.data?.error || 'Failed to load extractor');
      } finally {
        setIsLoading(false);
      }
    }

    loadExtractor();
  }, [extractorId, isNew]);

  const createSteps = useMemo(
    () => (isNew ? STEPS.filter((step) => step.key !== 'hold') : STEPS),
    [isNew]
  );

  const activeIndex = useMemo(
    () => createSteps.findIndex((step) => step.key === activeStep),
    [activeStep, createSteps]
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

  async function handleAddFeedback() {
    if (!feedbackText.trim()) {
      setFeedbackError('Feedback text is required');
      return;
    }

    setFeedbackError('');
    setFeedbackStatus('');

    try {
      const feedback = await addExtractorFeedback(extractorId, {
        documentId: feedbackDocumentId.trim() || null,
        targetType: feedbackTargetType,
        targetPath: feedbackTargetPath.trim(),
        feedbackText: feedbackText.trim()
      });
      setFeedbacks((current) => [feedback, ...current]);
      setFeedbackStatus('Feedback recorded');
      setFeedbackDocumentId('');
      setFeedbackTargetPath('');
      setFeedbackText('');
    } catch (error) {
      setFeedbackError(error?.response?.data?.error || 'Failed to add feedback');
    }
  }

  async function handleDeleteFeedback(feedbackId) {
    setFeedbackError('');
    setFeedbackStatus('');

    try {
      await deleteExtractorFeedback(extractorId, feedbackId);
      setFeedbacks((current) => current.filter((item) => item.id !== feedbackId));
      setFeedbackStatus('Feedback removed');
    } catch (error) {
      setFeedbackError(error?.response?.data?.error || 'Failed to delete feedback');
    }
  }

  async function handleSendOutSelected() {
    if (!selectedHeldDocs.length) {
      return;
    }

    setStatusText('');
    setErrorText('');

    try {
      await sendOutFromExtractor(extractorId, { documentIds: selectedHeldDocs });
      setSelectedHeldDocs([]);
      const data = await listExtractors();
      const found = data.find((item) => item.id === extractorId);
      if (found) {
        setExtractorMeta(found);
        setHoldAllDocuments(Boolean(found.holdAllDocuments));
        setFeedbacks(found.feedbacks || []);
        setSchema(found.schema || DEFAULT_SCHEMA);
      }
      setStatusText('Selected documents sent out');
    } catch (error) {
      setErrorText(error?.response?.data?.error || 'Failed to send out documents');
    }
  }

  function toggleHeldSelection(docId) {
    if (!docId) {
      return;
    }
    setSelectedHeldDocs((current) =>
      current.includes(docId) ? current.filter((id) => id !== docId) : [...current, docId]
    );
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
        const params = new URLSearchParams(location.search);
        const returnTo = params.get('returnTo');
        const returnNodeId = params.get('nodeId');

        if (returnTo && returnNodeId) {
          navigate(`${returnTo}?nodeId=${returnNodeId}&assignExtractorId=${extractor.id}`);
          return;
        }

        navigate('/app/services/extractors');
        return;
      }

      const extractor = await updateExtractor(extractorId, {
        name,
        schema,
        holdAllDocuments
      });
      setExtractorMeta(extractor);
      setFeedbacks(extractor.feedbacks || []);
      setStatusText('Extractor updated');
    } catch (error) {
      setErrorText(error?.response?.data?.error || 'Failed to save extractor');
    } finally {
      setIsSaving(false);
    }
  }

  function nextStep() {
    if (!isNew) {
      return;
    }

    if (activeIndex >= createSteps.length - 1) {
      handleSave();
      return;
    }

    const nextIndex = Math.min(activeIndex + 1, createSteps.length - 1);
    setActiveStep(createSteps[nextIndex].key);
  }

  function previousStep() {
    if (!isNew) {
      return;
    }

    const nextIndex = Math.max(activeIndex - 1, 0);
    setActiveStep(createSteps[nextIndex].key);
  }

  const requiredHeaderCount = (schema.headerFields || []).filter((item) => item.required).length;
  const requiredTableCount = (schema.tableTypes || []).filter((item) => item.required).length;
  const heldDocuments = extractorMeta?.heldDocuments || emptyArray;
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
  const resolveHeldReason = (heldDocument) => {
    const explicit = heldDocument?.reason || heldDocument?.metadata?.holdReason;
    if (explicit) {
      return explicit;
    }
    const missingFields = heldDocument?.metadata?.missingFields;
    if (Array.isArray(missingFields) && missingFields.length) {
      return `Missing fields: ${missingFields.join(', ')}`;
    }
    return holdAllDocuments ? 'Held by policy' : 'Missing required fields';
  };

  useEffect(() => {
    setSelectedHeldDocs((current) => {
      if (!heldDocuments.length) {
        return current.length ? [] : current;
      }

      const next = current.filter((id) =>
        heldDocuments.some((item) => item.document?.id === id)
      );

      if (next.length === current.length && next.every((id, index) => id === current[index])) {
        return current;
      }

      return next;
    });
  }, [heldDocuments]);

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
            {isSaving ? 'Saving...' : isNew ? 'Create Extractor' : 'Save Extractor'}
          </button>
        </div>
      </header>

      {errorText ? <p className="status-error">{errorText}</p> : null}
      {statusText ? <p className="status-ok">{statusText}</p> : null}
      {isLoading ? <p>Loading extractor...</p> : null}

      {!isLoading ? (
        <>
          {isNew ? (
            <div className="stepper">
              {createSteps.map((step, index) => (
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
          ) : null}

          {!isNew ? (
            <div className="segmented-control" role="tablist">
              {[
                { key: 'schema', label: 'Schema' },
                { key: 'feedback', label: 'Training Feedback' },
                { key: 'held', label: 'Held Documents' }
              ].map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  aria-pressed={activeTab === tab.key}
                  onClick={() => setActiveTab(tab.key)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          ) : null}

          {isNew && activeStep === 'basics' ? (
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

          {(isNew ? activeStep === 'schema' : activeTab === 'schema') ? (
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

          {!isNew && activeTab === 'feedback' ? (
            <div className="panel-stack">
              <section className="panel">
                <div className="panel-header">
                  <div>
                    <h2>Capture Training Feedback</h2>
                    <p>Log corrections after testing documents so similar ones improve over time.</p>
                  </div>
                </div>
                <div className="form-grid">
                  <label htmlFor="feedback-document-id">Document ID</label>
                  <input
                    id="feedback-document-id"
                    type="text"
                    value={feedbackDocumentId}
                    onChange={(event) => setFeedbackDocumentId(event.target.value)}
                    placeholder="doc_123"
                  />

                  <label htmlFor="feedback-target-type">Target type</label>
                  <select
                    id="feedback-target-type"
                    value={feedbackTargetType}
                    onChange={(event) => setFeedbackTargetType(event.target.value)}
                  >
                    <option value="header">Header field</option>
                    <option value="table">Table column</option>
                  </select>

                  <label htmlFor="feedback-target-path">Target path</label>
                  <input
                    id="feedback-target-path"
                    type="text"
                    value={feedbackTargetPath}
                    onChange={(event) => setFeedbackTargetPath(event.target.value)}
                    placeholder="InvoiceNumber or LineItems[].Price"
                  />

                  <label htmlFor="feedback-text">Feedback</label>
                  <textarea
                    id="feedback-text"
                    rows={4}
                    value={feedbackText}
                    onChange={(event) => setFeedbackText(event.target.value)}
                    placeholder="Describe the correction that should be applied."
                  />
                </div>

                {feedbackError ? <p className="status-error">{feedbackError}</p> : null}
                {feedbackStatus ? <p className="status-ok">{feedbackStatus}</p> : null}

                <div className="panel-actions">
                  <button type="button" className="btn btn-outline" onClick={handleAddFeedback}>
                    Add Feedback
                  </button>
                </div>
              </section>

              <section className="panel">
                <div className="panel-header">
                  <div>
                    <h2>Feedback History</h2>
                    <p>Stored feedback used to guide future extractions.</p>
                  </div>
                </div>
                {feedbacks.length === 0 ? (
                  <p className="muted-text">No feedback recorded yet.</p>
                ) : (
                  <div className="data-table">
                    <div className="data-header four-col">
                      <span>Document</span>
                      <span>Target</span>
                      <span>Feedback</span>
                      <span></span>
                    </div>
                    {feedbacks.map((feedback) => (
                      <div className="data-row four-col" key={feedback.id}>
                        <div className="data-cell">
                          <span className="card-title">{feedback.documentId || 'Document'}</span>
                          <span className="data-meta">{feedback.createdAt ? formatTimestamp(feedback.createdAt) : ''}</span>
                        </div>
                        <div className="data-cell">
                          <span className="data-meta">
                            {feedback.targetType || 'Target'} {feedback.targetPath ? `· ${feedback.targetPath}` : ''}
                          </span>
                        </div>
                        <div className="data-cell">
                          <span className="data-meta">{feedback.feedbackText || '—'}</span>
                        </div>
                        <div className="data-cell">
                          <button
                            type="button"
                            className="icon-btn"
                            onClick={() => handleDeleteFeedback(feedback.id)}
                            aria-label="Delete feedback"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          ) : null}

          {!isNew && activeTab === 'held' ? (
            <section className="panel-stack">
              <section className="panel">
                <div className="panel-header">
                  <div>
                    <h2>Hold Settings</h2>
                    <p>Control when documents are held in this extractor.</p>
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
                    <span className="toggle-label">Hold all documents by default</span>
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
                  <div className="card-item">
                    <div className="card-title">Held Documents</div>
                    <div className="card-meta">
                      {extractorMeta?.heldDocumentCount || extractorMeta?.heldDocuments?.length || 0}
                    </div>
                  </div>
                </div>
              </section>

              <section className="panel">
                <div className="panel-header">
                  <div>
                    <h2>Held Documents</h2>
                    <p>Review documents waiting for manual release.</p>
                  </div>
                  <div className="panel-actions">
                    <button
                      type="button"
                      className="btn btn-outline"
                      onClick={handleSendOutSelected}
                      disabled={!selectedHeldDocs.length}
                    >
                      Send Selected ({selectedHeldDocs.length})
                    </button>
                  </div>
                </div>

                {heldDocuments.length === 0 ? (
                  <p className="muted-text">No held documents for this extractor.</p>
                ) : (
                  <div className="data-table">
                    <div className="data-header five-col">
                      <span></span>
                      <span>Document</span>
                      <span>Reason</span>
                      <span>Workflow</span>
                      <span>Held At</span>
                    </div>
                    {heldDocuments.map((item, index) => {
                      const docId = item.document?.id;
                      const isSelected = docId ? selectedHeldDocs.includes(docId) : false;
                      return (
                        <div className="data-row five-col" key={docId || `${index}`}>
                          <div className="data-cell">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleHeldSelection(docId)}
                              disabled={!docId}
                            />
                          </div>
                          <div className="data-cell">
                            <span className="card-title">
                              {item.document?.fileName || item.document?.id || 'Document'}
                            </span>
                            <span className="data-meta">{item.document?.id || 'No ID'}</span>
                          </div>
                          <div className="data-cell">
                            <span className="data-meta">{resolveHeldReason(item)}</span>
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
                            <span className="data-meta">{formatTimestamp(item.heldAt || item.arrivedAt)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            </section>
          ) : null}

          {isNew ? (
            <div className="panel-actions">
              <button type="button" className="btn btn-ghost" onClick={previousStep} disabled={activeIndex === 0}>
                Back
              </button>
              <button
                type="button"
                className="btn btn-outline"
                onClick={nextStep}
                disabled={isSaving}
              >
                {activeIndex >= createSteps.length - 1 ? 'Create Extractor' : 'Next'}
              </button>
            </div>
          ) : null}

          {!isNew && activeTab === 'schema' ? (
            <section className="panel">
              <div className="panel-header">
                <div>
                  <h2>Workflow Usage</h2>
                  <p>Jump to the nodes using this extractor.</p>
                </div>
              </div>
              <UsageList usages={extractorMeta?.nodeUsages || []} />
            </section>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
