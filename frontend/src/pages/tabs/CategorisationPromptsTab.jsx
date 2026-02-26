import React, { useEffect, useState } from 'react';
import {
  createCategorisationPrompt,
  deleteCategorisationPrompt,
  listCategorisationPrompts,
  updateCategorisationPrompt
} from '../../services/configServiceNodesApi';

export function CategorisationPromptsTab() {
  const [prompts, setPrompts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorText, setErrorText] = useState('');
  const [promptName, setPromptName] = useState('');
  const [labelName, setLabelName] = useState('');
  const [labelDescription, setLabelDescription] = useState('');
  const [labels, setLabels] = useState([]);
  const [editingPromptId, setEditingPromptId] = useState(null);

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

  function addLabel() {
    if (!labelName.trim()) {
      setErrorText('Label name is required');
      return;
    }

    if (labels.length >= 20) {
      setErrorText('Categorisation labels cannot exceed 20 items');
      return;
    }

    setErrorText('');
    setLabels((current) => [...current, { label: labelName, description: labelDescription }]);
    setLabelName('');
    setLabelDescription('');
  }

  function removeLabel(index) {
    setLabels((current) => current.filter((_, idx) => idx !== index));
  }

  async function handleSubmit() {
    if (!promptName.trim()) {
      setErrorText('Prompt name is required');
      return;
    }

    setErrorText('');

    try {
      if (editingPromptId) {
        await updateCategorisationPrompt(editingPromptId, {
          name: promptName,
          labels
        });
      } else {
        await createCategorisationPrompt({
          name: promptName,
          labels
        });
      }

      setEditingPromptId(null);
      setPromptName('');
      setLabels([]);
      await loadPrompts();
    } catch (error) {
      setErrorText(error?.response?.data?.error || 'Failed to save categorisation prompt');
    }
  }

  async function handleDelete(promptId) {
    setErrorText('');

    try {
      await deleteCategorisationPrompt(promptId);
      await loadPrompts();
    } catch (error) {
      setErrorText(error?.response?.data?.error || 'Failed to delete categorisation prompt');
    }
  }

  function beginEdit(prompt) {
    setEditingPromptId(prompt.id);
    setPromptName(prompt.name);
    setLabels(prompt.labels || []);
    setLabelName('');
    setLabelDescription('');
  }

  function cancelEdit() {
    setEditingPromptId(null);
    setPromptName('');
    setLabels([]);
    setLabelName('');
    setLabelDescription('');
  }

  return (
    <section className="panel">
      <h2>Document Categorisation Prompts</h2>
      <p>Define categorisation labels and descriptions (up to 20 labels).</p>

      <label htmlFor="categorisation-prompt-name">Prompt name</label>
      <br />
      <input
        id="categorisation-prompt-name"
        type="text"
        value={promptName}
        onChange={(event) => setPromptName(event.target.value)}
      />

      <p>Labels ({labels.length}/20)</p>
      <input
        type="text"
        placeholder="Label"
        value={labelName}
        onChange={(event) => setLabelName(event.target.value)}
      />
      <input
        type="text"
        placeholder="Label description"
        value={labelDescription}
        onChange={(event) => setLabelDescription(event.target.value)}
      />
      <button type="button" onClick={addLabel}>
        Add Label
      </button>

      <ul>
        {labels.map((item, index) => (
          <li key={`${item.label}-${index}`}>
            {item.label}: {item.description}
            <button type="button" onClick={() => removeLabel(index)}>
              Remove
            </button>
          </li>
        ))}
      </ul>

      <button type="button" onClick={handleSubmit}>
        {editingPromptId ? 'Save Categorisation Prompt' : 'Add Categorisation Prompt'}
      </button>
      {editingPromptId ? (
        <button type="button" onClick={cancelEdit}>
          Cancel Edit
        </button>
      ) : null}

      {errorText ? <p className="status-error">{errorText}</p> : null}
      {isLoading ? <p>Loading categorisation prompts...</p> : null}
      {!isLoading && prompts.length === 0 ? <p>No categorisation prompts yet.</p> : null}

      <ul>
        {prompts.map((prompt) => (
          <li key={prompt.id}>
            <strong>{prompt.name}</strong>
            <p>Labels: {prompt.labels?.length || 0}</p>
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
