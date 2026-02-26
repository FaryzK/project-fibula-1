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
    <section>
      <h2>Document Splitting Prompts</h2>
      <p>Add reusable splitting instructions for document splitting nodes.</p>

      <label htmlFor="splitting-prompt-name">Prompt name</label>
      <br />
      <input
        id="splitting-prompt-name"
        type="text"
        value={name}
        onChange={(event) => setName(event.target.value)}
      />
      <br />
      <label htmlFor="splitting-prompt-instructions">Instructions</label>
      <br />
      <textarea
        id="splitting-prompt-instructions"
        rows={4}
        value={instructions}
        onChange={(event) => setInstructions(event.target.value)}
      />
      <br />
      <button type="button" onClick={handleSubmit}>
        {editingPromptId ? 'Save Splitting Prompt' : 'Add New Splitting Instructions'}
      </button>
      {editingPromptId ? (
        <button type="button" onClick={cancelEdit}>
          Cancel Edit
        </button>
      ) : null}

      {errorText ? <p>{errorText}</p> : null}
      {isLoading ? <p>Loading splitting prompts...</p> : null}
      {!isLoading && prompts.length === 0 ? <p>No splitting prompts yet.</p> : null}

      <ul>
        {prompts.map((prompt) => (
          <li key={prompt.id}>
            <strong>{prompt.name}</strong>
            <p>{prompt.instructionsPreview || '(No instructions)'}</p>
            <p>Used by nodes: {prompt.nodeUsages?.length || 0}</p>
            <button type="button" onClick={() => beginEdit(prompt)}>
              Edit
            </button>
            <button type="button" onClick={() => handleDelete(prompt.id)}>
              Delete
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
