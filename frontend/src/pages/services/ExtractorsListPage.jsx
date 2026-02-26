import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listExtractors } from '../../services/configServiceNodesApi';

export function ExtractorsListPage() {
  const [extractors, setExtractors] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorText, setErrorText] = useState('');

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

  return (
    <div className="panel-stack">
      <header className="section-header">
        <div>
          <span className="section-eyebrow">Services</span>
          <h1>Extractors</h1>
          <p className="section-subtitle">Create schemas, manage held documents, and run feedback.</p>
        </div>
        <div className="section-actions">
          <Link className="btn btn-primary" to="/app/services/extractors/new">
            New Extractor
          </Link>
        </div>
      </header>

      {errorText ? <p className="status-error">{errorText}</p> : null}
      {isLoading ? <p>Loading extractors...</p> : null}
      {!isLoading && extractors.length === 0 ? <p>No extractors yet.</p> : null}

      {!isLoading && extractors.length > 0 ? (
        <div className="card-grid">
          {extractors.map((extractor) => (
            <div className="card-item" key={extractor.id}>
              <div className="card-header">
                <div className="card-title">{extractor.name}</div>
                <Link
                  className="icon-btn-neutral"
                  to={`/app/services/extractors/${extractor.id}`}
                  aria-label="Edit extractor"
                >
                  ✎
                </Link>
              </div>
              <div className="card-meta">Edit schema, training feedback, and held documents.</div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
