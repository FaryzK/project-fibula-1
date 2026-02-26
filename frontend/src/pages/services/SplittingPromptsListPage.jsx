import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listSplittingPrompts } from '../../services/configServiceNodesApi';

export function SplittingPromptsListPage() {
  const [prompts, setPrompts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorText, setErrorText] = useState('');

  async function loadPrompts() {
    setIsLoading(true);
    setErrorText('');

    try {
      const data = await listSplittingPrompts();
      setPrompts(data);
    } catch (error) {
      setErrorText(error?.response?.data?.error || 'Failed to load splitting prompts');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadPrompts();
  }, []);

  return (
    <div className="panel-stack">
      <header className="section-header">
        <div>
          <span className="section-eyebrow">Services</span>
          <h1>Document Splitting</h1>
          <p className="section-subtitle">Manage prompts that split multi-page documents.</p>
        </div>
        <div className="section-actions">
          <Link className="btn btn-primary" to="/app/services/document-splitting/new">
            New Splitting Prompt
          </Link>
        </div>
      </header>

      {errorText ? <p className="status-error">{errorText}</p> : null}
      {isLoading ? <p>Loading splitting prompts...</p> : null}
      {!isLoading && prompts.length === 0 ? <p>No splitting prompts yet.</p> : null}

      {!isLoading && prompts.length > 0 ? (
        <div className="service-list">
          {prompts.map((prompt) => (
            <div className="service-row" key={prompt.id}>
              <div className="card-title">{prompt.name || 'Untitled Splitting Prompt'}</div>
              <Link
                className="icon-btn-neutral"
                to={`/app/services/document-splitting/${prompt.id}`}
                aria-label="Edit splitting prompt"
              >
                ✎
              </Link>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
