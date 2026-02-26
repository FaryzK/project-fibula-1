import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { deleteSplittingPrompt, listSplittingPrompts } from '../../services/configServiceNodesApi';

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

  async function handleDelete(promptId) {
    setErrorText('');

    try {
      await deleteSplittingPrompt(promptId);
      await loadPrompts();
    } catch (error) {
      setErrorText(error?.response?.data?.error || 'Failed to delete splitting prompt');
    }
  }

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
        <div className="card-grid">
          {prompts.map((prompt) => (
            <div className="card-item" key={prompt.id}>
              <div className="card-title">{prompt.name}</div>
              <div className="card-meta">{prompt.instructionsPreview || '(No instructions)'}</div>
              <div className="card-meta">Used by nodes: {prompt.nodeUsages?.length || 0}</div>
              <div className="panel-actions">
                <Link className="btn btn-outline" to={`/app/services/document-splitting/${prompt.id}`}>
                  Manage
                </Link>
                <button type="button" className="btn-danger" onClick={() => handleDelete(prompt.id)}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
