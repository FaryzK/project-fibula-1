import React, { useEffect, useState } from 'react';
import {
  createExtractor,
  deleteExtractor,
  listExtractors,
  updateExtractor
} from '../../services/configServiceNodesApi';

const DEFAULT_SCHEMA = {
  headerFields: [],
  tableTypes: []
};

export function ExtractorsTab() {
  const [extractors, setExtractors] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorText, setErrorText] = useState('');
  const [extractorName, setExtractorName] = useState('');
  const [schemaText, setSchemaText] = useState(JSON.stringify(DEFAULT_SCHEMA, null, 2));
  const [editingExtractorId, setEditingExtractorId] = useState(null);

  async function loadExtractors() {
    setIsLoading(true);
    setErrorText('');

    try {
      const data = await listExtractors();
      setExtractors(data);
    } catch (error) {
      setErrorText(error?.response?.data?.error || 'Failed to load extractors');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadExtractors();
  }, []);

  async function handleSubmit() {
    if (!extractorName.trim()) {
      setErrorText('Extractor name is required');
      return;
    }

    let schema;
    try {
      schema = JSON.parse(schemaText);
    } catch (_error) {
      setErrorText('Schema must be valid JSON');
      return;
    }

    setErrorText('');

    try {
      if (editingExtractorId) {
        await updateExtractor(editingExtractorId, {
          name: extractorName,
          schema
        });
      } else {
        await createExtractor({
          name: extractorName,
          schema
        });
      }

      setEditingExtractorId(null);
      setExtractorName('');
      setSchemaText(JSON.stringify(DEFAULT_SCHEMA, null, 2));
      await loadExtractors();
    } catch (error) {
      setErrorText(error?.response?.data?.error || 'Failed to save extractor');
    }
  }

  async function handleDelete(extractorId) {
    setErrorText('');

    try {
      await deleteExtractor(extractorId);
      await loadExtractors();
    } catch (error) {
      setErrorText(error?.response?.data?.error || 'Failed to delete extractor');
    }
  }

  async function toggleHoldAll(extractor) {
    await updateExtractor(extractor.id, {
      holdAllDocuments: !extractor.holdAllDocuments
    });
    await loadExtractors();
  }

  function beginEdit(extractor) {
    setEditingExtractorId(extractor.id);
    setExtractorName(extractor.name);
    setSchemaText(JSON.stringify(extractor.schema || DEFAULT_SCHEMA, null, 2));
  }

  function cancelEdit() {
    setEditingExtractorId(null);
    setExtractorName('');
    setSchemaText(JSON.stringify(DEFAULT_SCHEMA, null, 2));
  }

  return (
    <section className="panel-grid">
      <div className="panel">
        <div className="panel-header">
          <div>
            <h2>Extractors</h2>
            <p>Create extractor schema and manage held documents behavior.</p>
          </div>
        </div>

        <div className="form-grid">
          <label htmlFor="extractor-name">Extractor name</label>
          <input
            id="extractor-name"
            type="text"
            value={extractorName}
            onChange={(event) => setExtractorName(event.target.value)}
          />

          <label htmlFor="extractor-schema">Schema (JSON)</label>
          <textarea
            id="extractor-schema"
            rows={8}
            value={schemaText}
            onChange={(event) => setSchemaText(event.target.value)}
          />
        </div>

        <div className="panel-actions">
          <button type="button" className="btn-primary" onClick={handleSubmit}>
            {editingExtractorId ? 'Save Extractor' : 'New Extractor'}
          </button>
          {editingExtractorId ? (
            <button type="button" className="btn btn-ghost" onClick={cancelEdit}>
              Cancel Edit
            </button>
          ) : null}
        </div>

        {errorText ? <p className="status-error">{errorText}</p> : null}
      </div>

      <div className="panel">
        <div className="panel-header">
          <div>
            <h3>Extractor Library</h3>
            <p>Monitor feedback, held documents, and node usage.</p>
          </div>
        </div>

        {isLoading ? <p>Loading extractors...</p> : null}
        {!isLoading && extractors.length === 0 ? <p>No extractors yet.</p> : null}

        {!isLoading && extractors.length > 0 ? (
          <div className="card-grid">
            {extractors.map((extractor) => (
              <div className="card-item" key={extractor.id}>
                <div className="card-title">{extractor.name}</div>
                <div className="card-meta">
                  Held documents: {extractor.heldDocumentCount || extractor.heldDocuments?.length || 0}
                </div>
                <div className="card-meta">
                  Feedbacks: {extractor.feedbackCount || extractor.feedbacks?.length || 0}
                </div>
                <div className="card-meta">Used by nodes: {extractor.nodeUsages?.length || 0}</div>
                <div className="panel-actions">
                  <button type="button" className="btn btn-outline" onClick={() => beginEdit(extractor)}>
                    Edit
                  </button>
                  <button type="button" className="btn btn-outline" onClick={() => toggleHoldAll(extractor)}>
                    {extractor.holdAllDocuments ? 'Disable Hold All' : 'Enable Hold All'}
                  </button>
                  <button type="button" className="btn-danger" onClick={() => handleDelete(extractor.id)}>
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
