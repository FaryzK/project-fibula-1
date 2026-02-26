import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  createSplittingPrompt,
  deleteSplittingPrompt,
  listSplittingPrompts,
  updateSplittingPrompt
} from '../../services/configServiceNodesApi';
import { UsageList } from '../../components/UsageList';

export function SplittingPromptDetailPage() {
  const { promptId } = useParams();
  const navigate = useNavigate();
  const isNew = !promptId;

  const [name, setName] = useState('');
  const [instructions, setInstructions] = useState('');
  const [nodeUsages, setNodeUsages] = useState([]);
  const [isLoading, setIsLoading] = useState(!isNew);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
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
        const data = await listSplittingPrompts();
        const found = data.find((item) => item.id === promptId);

        if (!found) {
          setErrorText('Splitting prompt not found');
          return;
        }

        setName(found.name || '');
        setInstructions(found.instructions || '');
        setNodeUsages(found.nodeUsages || []);
      } catch (error) {
        setErrorText(error?.response?.data?.error || 'Failed to load splitting prompt');
      } finally {
        setIsLoading(false);
      }
    }

    loadPrompt();
  }, [promptId, isNew]);

  async function handleSave() {
    if (!name.trim()) {
      setErrorText('Prompt name is required');
      return;
    }

    setIsSaving(true);
    setErrorText('');
    setStatusText('');

    try {
      if (isNew) {
        const prompt = await createSplittingPrompt({ name, instructions });
        setStatusText('Prompt created');
        navigate(`/app/services/document-splitting/${prompt.id}`);
        return;
      }

      await updateSplittingPrompt(promptId, { name, instructions });
      setStatusText('Prompt updated');
    } catch (error) {
      setErrorText(error?.response?.data?.error || 'Failed to save prompt');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (isNew) {
      return;
    }

    setIsDeleting(true);
    setErrorText('');
    setStatusText('');

    try {
      await deleteSplittingPrompt(promptId);
      navigate('/app/services/document-splitting');
    } catch (error) {
      setErrorText(error?.response?.data?.error || 'Failed to delete prompt');
      setIsDeleting(false);
    }
  }

  return (
    <div className="panel-stack">
      <header className="section-header">
        <div className="section-title-row">
          <Link
            className="icon-btn-neutral icon-btn-lg"
            to="/app/services/document-splitting"
            aria-label="Back to splitting prompts"
          >
            ←
          </Link>
          <div>
            <h1>{name.trim() || (isNew ? 'New Splitting Prompt' : 'Splitting Prompt')}</h1>
          </div>
        </div>
        <div className="section-actions">
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
                <p>Provide clear splitting instructions for the model.</p>
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
                rows={6}
                value={instructions}
                onChange={(event) => setInstructions(event.target.value)}
              />
            </div>

            {!isNew ? (
              <div className="panel-actions align-right">
                <button type="button" className="btn-danger" onClick={handleDelete} disabled={isDeleting}>
                  {isDeleting ? 'Deleting...' : 'Delete Prompt'}
                </button>
              </div>
            ) : null}
          </section>

          {!isNew ? (
            <section className="panel">
              <div className="panel-header">
                <div>
                  <h2>Workflow Usage</h2>
                  <p>Jump to the nodes using this splitting prompt.</p>
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
