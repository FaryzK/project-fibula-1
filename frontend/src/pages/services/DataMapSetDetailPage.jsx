import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  createDataMapSet,
  listDataMapSets,
  updateDataMapSet
} from '../../services/dataMapperReconciliationApi';

function parseCsv(text) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (!lines.length) {
    return { headers: [], records: [] };
  }

  const headers = lines[0].split(',').map((value) => value.trim());
  const records = lines.slice(1).map((line) => line.split(',').map((value) => value.trim()));
  return { headers, records };
}

function parseJson(text) {
  const parsed = JSON.parse(text);
  if (Array.isArray(parsed)) {
    if (!parsed.length) {
      return { headers: [], records: [] };
    }

    if (typeof parsed[0] === 'object' && parsed[0] !== null && !Array.isArray(parsed[0])) {
      const headers = Object.keys(parsed[0]);
      const records = parsed.map((row) => headers.map((key) => row[key] ?? ''));
      return { headers, records };
    }

    if (Array.isArray(parsed[0])) {
      return { headers: parsed[0].map(String), records: parsed.slice(1) };
    }
  }

  throw new Error('JSON must be an array of objects or arrays.');
}

function normalizeRecords(nextHeaders, nextRecords) {
  if (!Array.isArray(nextRecords) || nextRecords.length === 0) {
    return { headers: nextHeaders, records: nextRecords || [] };
  }

  const first = nextRecords[0];
  if (Array.isArray(first)) {
    return { headers: nextHeaders, records: nextRecords };
  }

  if (typeof first === 'object' && first !== null) {
    const headers = nextHeaders.length ? nextHeaders : Object.keys(first);
    const records = nextRecords.map((row) => headers.map((key) => row[key] ?? ''));
    return { headers, records };
  }

  return { headers: nextHeaders, records: nextRecords };
}

export function DataMapSetDetailPage() {
  const { setId } = useParams();
  const navigate = useNavigate();
  const isNew = !setId;

  const [name, setName] = useState('');
  const [headers, setHeaders] = useState([]);
  const [records, setRecords] = useState([]);
  const [newHeader, setNewHeader] = useState('');
  const [isLoading, setIsLoading] = useState(!isNew);
  const [isSaving, setIsSaving] = useState(false);
  const [errorText, setErrorText] = useState('');
  const [statusText, setStatusText] = useState('');

  useEffect(() => {
    if (isNew) {
      return;
    }

    async function loadSet() {
      setIsLoading(true);
      setErrorText('');

      try {
        const data = await listDataMapSets();
        const found = data.find((item) => item.id === setId);

        if (!found) {
          setErrorText('Data map set not found');
          return;
        }

        const headersValue = found.headers || [];
        const recordsValue = found.records || [];
        const normalized = normalizeRecords(headersValue, recordsValue);
        setName(found.name || '');
        setHeaders(normalized.headers || []);
        setRecords(normalized.records || []);
      } catch (error) {
        setErrorText(error?.response?.data?.error || 'Failed to load data map set');
      } finally {
        setIsLoading(false);
      }
    }

    loadSet();
  }, [setId, isNew]);

  function addHeader() {
    if (!newHeader.trim()) {
      setErrorText('Header name is required');
      return;
    }

    setErrorText('');
    setHeaders((previous) => [...previous, newHeader.trim()]);
    setRecords((previous) => previous.map((row) => [...row, '']));
    setNewHeader('');
  }

  function removeHeader(index) {
    setHeaders((previous) => previous.filter((_, idx) => idx !== index));
    setRecords((previous) => previous.map((row) => row.filter((_, idx) => idx !== index)));
  }

  function updateHeader(index, value) {
    setHeaders((previous) => previous.map((header, idx) => (idx === index ? value : header)));
  }

  function addRow() {
    setRecords((previous) => [...previous, headers.map(() => '')]);
  }

  function removeRow(index) {
    setRecords((previous) => previous.filter((_, idx) => idx !== index));
  }

  function updateCell(rowIndex, columnIndex, value) {
    setRecords((previous) => {
      const next = [...previous];
      const row = [...(next[rowIndex] || [])];
      row[columnIndex] = value;
      next[rowIndex] = row;
      return next;
    });
  }

  function handleFileUpload(event) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = String(reader.result || '');
        const parsed = file.name.endsWith('.json') ? parseJson(text) : parseCsv(text);
        setHeaders(parsed.headers);
        setRecords(parsed.records);
        setErrorText('');
      } catch (error) {
        setErrorText(error.message || 'Failed to parse file');
      }
    };
    reader.readAsText(file);
  }

  async function handleSave() {
    if (!name.trim()) {
      setErrorText('Data map set name is required');
      return;
    }

    setIsSaving(true);
    setErrorText('');
    setStatusText('');

    try {
      if (isNew) {
        const dataMapSet = await createDataMapSet({ name, headers, records });
        setStatusText('Data map set created');
        navigate(`/app/services/data-mapper/sets/${dataMapSet.id}`);
        return;
      }

      await updateDataMapSet(setId, { name, headers, records });
      setStatusText('Data map set updated');
    } catch (error) {
      setErrorText(error?.response?.data?.error || 'Failed to save data map set');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="panel-stack">
      <header className="section-header">
        <div>
          <span className="section-eyebrow">Service Setup</span>
          <h1>{isNew ? 'New Data Map Set' : 'Data Map Set'}</h1>
          <p className="section-subtitle">Upload or curate lookup tables used for enrichment.</p>
        </div>
        <div className="section-actions">
          <Link className="btn btn-ghost" to="/app/services/data-mapper">
            Back to Data Mapper
          </Link>
          <button type="button" className="btn-primary" onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Data Map Set'}
          </button>
        </div>
      </header>

      {errorText ? <p className="status-error">{errorText}</p> : null}
      {statusText ? <p className="status-ok">{statusText}</p> : null}
      {isLoading ? <p>Loading data map set...</p> : null}

      {!isLoading ? (
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Set Details</h2>
              <p>Define the table headers and records used for lookups.</p>
            </div>
          </div>

          <div className="form-grid">
            <label htmlFor="data-map-set-name">Set name</label>
            <input
              id="data-map-set-name"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />

            <label htmlFor="data-map-set-upload">Upload CSV or JSON</label>
            <input
              id="data-map-set-upload"
              type="file"
              accept=".csv,.json"
              onChange={handleFileUpload}
            />
          </div>

          <div className="panel-header">
            <h3>Headers</h3>
          </div>
          <div className="panel-actions">
            <input
              type="text"
              value={newHeader}
              placeholder="Add header"
              onChange={(event) => setNewHeader(event.target.value)}
            />
            <button type="button" className="btn btn-outline" onClick={addHeader}>
              Add Header
            </button>
          </div>

          {headers.length === 0 ? <p>No headers yet.</p> : null}

          {headers.length > 0 ? (
            <div className="table-editor">
              <div className="table-row table-head">
                {headers.map((header, index) => (
                  <div className="table-cell" key={`header-${index}`}>
                    <input
                      type="text"
                      value={header}
                      onChange={(event) => updateHeader(index, event.target.value)}
                    />
                    <button type="button" className="btn btn-ghost" onClick={() => removeHeader(index)}>
                      Remove
                    </button>
                  </div>
                ))}
              </div>
              {records.map((row, rowIndex) => (
                <div className="table-row" key={`row-${rowIndex}`}>
                  {headers.map((_, columnIndex) => (
                    <div className="table-cell" key={`cell-${rowIndex}-${columnIndex}`}>
                      <input
                        type="text"
                        value={row[columnIndex] || ''}
                        onChange={(event) => updateCell(rowIndex, columnIndex, event.target.value)}
                      />
                    </div>
                  ))}
                  <div className="table-cell">
                    <button type="button" className="btn btn-ghost" onClick={() => removeRow(rowIndex)}>
                      Remove Row
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          <div className="panel-actions">
            <button type="button" className="btn btn-outline" onClick={addRow} disabled={headers.length === 0}>
              Add Row
            </button>
          </div>
        </section>
      ) : null}
    </div>
  );
}
