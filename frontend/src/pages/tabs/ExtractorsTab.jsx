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
    <section>
      <h2>Extractors</h2>
      <p>Create extractor schema and manage held documents behavior.</p>

      <label htmlFor="extractor-name">Extractor name</label>
      <br />
      <input
        id="extractor-name"
        type="text"
        value={extractorName}
        onChange={(event) => setExtractorName(event.target.value)}
      />
      <br />
      <label htmlFor="extractor-schema">Schema (JSON)</label>
      <br />
      <textarea
        id="extractor-schema"
        rows={8}
        value={schemaText}
        onChange={(event) => setSchemaText(event.target.value)}
      />
      <br />
      <button type="button" onClick={handleSubmit}>
        {editingExtractorId ? 'Save Extractor' : '+ New Extractor'}
      </button>
      {editingExtractorId ? (
        <button type="button" onClick={cancelEdit}>
          Cancel Edit
        </button>
      ) : null}

      {errorText ? <p>{errorText}</p> : null}
      {isLoading ? <p>Loading extractors...</p> : null}
      {!isLoading && extractors.length === 0 ? <p>No extractors yet.</p> : null}

      <ul>
        {extractors.map((extractor) => (
          <li key={extractor.id}>
            <strong>{extractor.name}</strong>
            <p>Held documents: {extractor.heldDocumentCount || extractor.heldDocuments?.length || 0}</p>
            <p>Feedbacks: {extractor.feedbackCount || extractor.feedbacks?.length || 0}</p>
            <p>Used by nodes: {extractor.nodeUsages?.length || 0}</p>
            <button type="button" onClick={() => beginEdit(extractor)}>
              Edit
            </button>
            <button type="button" onClick={() => handleDelete(extractor.id)}>
              Delete
            </button>
            <button type="button" onClick={() => toggleHoldAll(extractor)}>
              {extractor.holdAllDocuments ? 'Disable Hold All' : 'Enable Hold All'}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
