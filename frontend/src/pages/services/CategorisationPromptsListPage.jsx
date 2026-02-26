import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listCategorisationPrompts } from '../../services/configServiceNodesApi';

export function CategorisationPromptsListPage() {
  const [prompts, setPrompts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorText, setErrorText] = useState('');

  async function loadPrompts() {
    setIsLoading(true);
    setErrorText('');

    try {
      const data = await listCategorisationPrompts();
      setPrompts(data);
    } catch (error) {
      setErrorText(error?.response?.data?.error || 'Failed to load categorisation prompts');
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
          <h1>Document Categorisation</h1>
          <p className="section-subtitle">Manage prompts that label document categories.</p>
        </div>
        <div className="section-actions">
          <Link className="btn btn-primary" to="/app/services/document-categorisation/new">
            New Categorisation Prompt
          </Link>
        </div>
      </header>

      {errorText ? <p className="status-error">{errorText}</p> : null}
      {isLoading ? <p>Loading categorisation prompts...</p> : null}
      {!isLoading && prompts.length === 0 ? <p>No categorisation prompts yet.</p> : null}

      {!isLoading && prompts.length > 0 ? (
        <div className="service-list">
          {prompts.map((prompt) => (
            <div className="service-row" key={prompt.id}>
              <div className="card-title">{prompt.name || 'Untitled Categorisation Prompt'}</div>
              <Link
                className="icon-btn-neutral"
                to={`/app/services/document-categorisation/${prompt.id}`}
                aria-label="Edit categorisation prompt"
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
