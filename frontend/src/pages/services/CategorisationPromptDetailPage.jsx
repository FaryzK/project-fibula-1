import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  createCategorisationPrompt,
  listCategorisationPrompts,
  updateCategorisationPrompt
} from '../../services/configServiceNodesApi';
import { UsageList } from '../../components/UsageList';

export function CategorisationPromptDetailPage() {
  const { promptId } = useParams();
  const navigate = useNavigate();
  const isNew = !promptId;

  const [promptName, setPromptName] = useState('');
  const [labelName, setLabelName] = useState('');
  const [labelDescription, setLabelDescription] = useState('');
  const [labels, setLabels] = useState([]);
  const [nodeUsages, setNodeUsages] = useState([]);
  const [isLoading, setIsLoading] = useState(!isNew);
  const [isSaving, setIsSaving] = useState(false);
  const [errorText, setErrorText] = useState('');
  const [statusText, setStatusText] = useState('');

  useEffect(() => {
    if (isNew) {
      return;
    }

    async function loadPrompt() {
      setIsLoading(true);
      setErrorText('');

      try {
        const data = await listCategorisationPrompts();
        const found = data.find((item) => item.id === promptId);

        if (!found) {
          setErrorText('Categorisation prompt not found');
          return;
        }

        setPromptName(found.name || '');
        setLabels(found.labels || []);
        setNodeUsages(found.nodeUsages || []);
      } catch (error) {
        setErrorText(error?.response?.data?.error || 'Failed to load categorisation prompt');
      } finally {
        setIsLoading(false);
      }
    }

    loadPrompt();
  }, [promptId, isNew]);

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

  async function handleSave() {
    if (!promptName.trim()) {
      setErrorText('Prompt name is required');
      return;
    }

    setIsSaving(true);
    setErrorText('');
    setStatusText('');

    try {
      if (isNew) {
        const prompt = await createCategorisationPrompt({ name: promptName, labels });
        setStatusText('Prompt created');
        navigate(`/app/services/document-categorisation/${prompt.id}`);
        return;
      }

      await updateCategorisationPrompt(promptId, { name: promptName, labels });
      setStatusText('Prompt updated');
    } catch (error) {
      setErrorText(error?.response?.data?.error || 'Failed to save categorisation prompt');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="panel-stack">
      <header className="section-header">
        <div>
          <span className="section-eyebrow">Service Setup</span>
          <h1>{isNew ? 'New Categorisation Prompt' : 'Categorisation Prompt'}</h1>
          <p className="section-subtitle">Define labels used to categorise incoming documents.</p>
        </div>
        <div className="section-actions">
          <Link className="btn btn-ghost" to="/app/services/document-categorisation">
            Back to Prompts
          </Link>
          <button type="button" className="btn-primary" onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Prompt'}
          </button>
        </div>
      </header>

      {errorText ? <p className="status-error">{errorText}</p> : null}
      {statusText ? <p className="status-ok">{statusText}</p> : null}
      {isLoading ? <p>Loading prompt...</p> : null}

      {!isLoading ? (
        <>
          <section className="panel">
            <div className="panel-header">
              <div>
                <h2>Prompt Details</h2>
                <p>Maintain up to 20 categorisation labels for this prompt.</p>
              </div>
            </div>

            <div className="form-grid">
              <label htmlFor="categorisation-prompt-name">Prompt name</label>
              <input
                id="categorisation-prompt-name"
                type="text"
                value={promptName}
                onChange={(event) => setPromptName(event.target.value)}
              />

              <label>Label name</label>
              <input
                type="text"
                value={labelName}
                onChange={(event) => setLabelName(event.target.value)}
                placeholder="e.g. Invoice"
              />

              <label>Label description</label>
              <input
                type="text"
                value={labelDescription}
                onChange={(event) => setLabelDescription(event.target.value)}
                placeholder="Describe when this label applies"
              />

              <button type="button" className="btn btn-outline" onClick={addLabel}>
                Add Label
              </button>
            </div>

            {labels.length > 0 ? (
              <div className="card-grid">
                {labels.map((item, index) => (
                  <div className="card-item" key={`${item.label}-${index}`}>
                    <div className="card-title">{item.label}</div>
                    <div className="card-meta">{item.description || 'No description'}</div>
                    <div className="panel-actions">
                      <button type="button" className="btn btn-ghost" onClick={() => removeLabel(index)}>
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </section>

          {!isNew ? (
            <section className="panel">
              <div className="panel-header">
                <div>
                  <h2>Workflow Usage</h2>
                  <p>Jump to the nodes using this categorisation prompt.</p>
                </div>
              </div>
              <UsageList usages={nodeUsages} />
            </section>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
