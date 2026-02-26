import React, { useEffect, useState } from 'react';
import {
  createSplittingPrompt,
  deleteSplittingPrompt,
  listSplittingPrompts,
  updateSplittingPrompt
} from '../../services/configServiceNodesApi';

export function SplittingPromptsTab() {
  const [prompts, setPrompts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorText, setErrorText] = useState('');
  const [name, setName] = useState('');
  const [instructions, setInstructions] = useState('');
  const [editingPromptId, setEditingPromptId] = useState(null);

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

  async function handleSubmit() {
    if (!name.trim()) {
      setErrorText('Prompt name is required');
      return;
    }

    setErrorText('');

    try {
      if (editingPromptId) {
        await updateSplittingPrompt(editingPromptId, {
          name,
          instructions
        });
      } else {
        await createSplittingPrompt({
          name,
          instructions
        });
      }

      setEditingPromptId(null);
      setName('');
      setInstructions('');
      await loadPrompts();
    } catch (error) {
      setErrorText(error?.response?.data?.error || 'Failed to save splitting prompt');
    }
  }

  async function handleDelete(promptId) {
    setErrorText('');

    try {
      await deleteSplittingPrompt(promptId);
      await loadPrompts();
    } catch (error) {
      setErrorText(error?.response?.data?.error || 'Failed to delete splitting prompt');
    }
  }

  function beginEdit(prompt) {
    setEditingPromptId(prompt.id);
    setName(prompt.name);
    setInstructions(prompt.instructions || '');
  }

  function cancelEdit() {
    setEditingPromptId(null);
    setName('');
    setInstructions('');
  }

  return (
    <section className="panel-grid">
      <div className="panel">
        <div className="panel-header">
          <div>
            <h2>Document Splitting Prompts</h2>
            <p>Add reusable splitting instructions for document splitting nodes.</p>
          </div>
        </div>

        <div className="form-grid">
          <label htmlFor="splitting-prompt-name">Prompt name</label>
          <input
            id="splitting-prompt-name"
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />

          <label htmlFor="splitting-prompt-instructions">Instructions</label>
          <textarea
            id="splitting-prompt-instructions"
            rows={4}
            value={instructions}
            onChange={(event) => setInstructions(event.target.value)}
          />
        </div>

        <div className="panel-actions">
          <button type="button" className="btn-primary" onClick={handleSubmit}>
            {editingPromptId ? 'Save Splitting Prompt' : 'Add New Splitting Instructions'}
          </button>
          {editingPromptId ? (
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
            <h3>Prompt Library</h3>
            <p>Reuse these prompts across splitting nodes.</p>
          </div>
        </div>

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
                  <button type="button" className="btn btn-outline" onClick={() => beginEdit(prompt)}>
                    Edit
                  </button>
                  <button type="button" className="btn-danger" onClick={() => handleDelete(prompt.id)}>
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
