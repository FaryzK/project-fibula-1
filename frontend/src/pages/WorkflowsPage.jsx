import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useWorkflowStore } from '../stores/workflowStore';

function WorkflowList() {
  const navigate = useNavigate();
  const workflows = useWorkflowStore((state) => state.workflows);
  const isLoading = useWorkflowStore((state) => state.isLoading);
  const error = useWorkflowStore((state) => state.error);
  const newWorkflowName = useWorkflowStore((state) => state.newWorkflowName);
  const setNewWorkflowName = useWorkflowStore((state) => state.setNewWorkflowName);
  const createWorkflow = useWorkflowStore((state) => state.createWorkflow);
  const renameWorkflow = useWorkflowStore((state) => state.renameWorkflow);
  const setWorkflowPublished = useWorkflowStore((state) => state.setWorkflowPublished);
  const deleteWorkflow = useWorkflowStore((state) => state.deleteWorkflow);
  const [editNamesById, setEditNamesById] = useState({});

  async function handleCreateWorkflow() {
    const { workflow } = await createWorkflow({ name: newWorkflowName });

    if (workflow?.id) {
      navigate(`/app/workflows/${workflow.id}/canvas`);
    }
  }

  function beginRename(workflow) {
    setEditNamesById((previous) => ({
      ...previous,
      [workflow.id]: workflow.name
    }));
  }

  function changeRename(workflowId, value) {
    setEditNamesById((previous) => ({
      ...previous,
      [workflowId]: value
    }));
  }

  async function saveRename(workflowId) {
    const nextName = editNamesById[workflowId];
    await renameWorkflow(workflowId, nextName);
    setEditNamesById((previous) => {
      const next = { ...previous };
      delete next[workflowId];
      return next;
    });
  }

  function cancelRename(workflowId) {
    setEditNamesById((previous) => {
      const next = { ...previous };
      delete next[workflowId];
      return next;
    });
  }

  return (
    <section className="panel-grid">
      <div className="panel">
        <div className="panel-header">
          <div>
            <h2>New Workflow</h2>
            <p>Start a new workflow and move straight to the canvas.</p>
          </div>
        </div>

        <div className="form-grid">
          <label htmlFor="new-workflow-name">Workflow name</label>
          <input
            id="new-workflow-name"
            type="text"
            value={newWorkflowName}
            onChange={(event) => setNewWorkflowName(event.target.value)}
            placeholder="e.g. Invoice approvals"
          />
        </div>

        <div className="panel-actions">
          <button type="button" className="btn-primary" onClick={handleCreateWorkflow}>
            Add Workflow
          </button>
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">
          <div>
            <h2>Workflows</h2>
            <p>Track published and draft workflows in the workspace.</p>
          </div>
        </div>

        {error ? <p className="status-error">{error}</p> : null}
        {isLoading ? <p>Loading workflows...</p> : null}
        {!isLoading && workflows.length === 0 ? <p>No workflows yet.</p> : null}

        {!isLoading && workflows.length > 0 ? (
          <div className="data-table">
            <div className="data-header">
              <span>Name</span>
              <span>Status</span>
              <span>Actions</span>
            </div>
            {workflows.map((workflow) => {
              const isEditing = editNamesById[workflow.id] !== undefined;

              return (
                <div className="data-row" key={workflow.id}>
                  <div className="data-cell">
                    {isEditing ? (
                      <input
                        aria-label={`Rename ${workflow.name}`}
                        type="text"
                        value={editNamesById[workflow.id]}
                        onChange={(event) => changeRename(workflow.id, event.target.value)}
                      />
                    ) : (
                      <>
                        <span className="card-title">{workflow.name}</span>
                        <span className="data-meta">ID: {workflow.id.slice(0, 6)}</span>
                      </>
                    )}
                  </div>
                  <div className="data-cell">
                    <span className={`tag ${workflow.isPublished ? 'tag-accent' : ''}`}>
                      {workflow.isPublished ? 'Published' : 'Draft'}
                    </span>
                  </div>
                  <div className="data-cell">
                    {isEditing ? (
                      <>
                        <button type="button" className="btn-primary" onClick={() => saveRename(workflow.id)}>
                          Save
                        </button>
                        <button type="button" className="btn btn-ghost" onClick={() => cancelRename(workflow.id)}>
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <Link className="btn btn-soft" to={`/app/workflows/${workflow.id}/canvas`}>
                          Open Canvas
                        </Link>
                        <button type="button" className="btn btn-outline" onClick={() => beginRename(workflow)}>
                          Rename
                        </button>
                        <button
                          type="button"
                          className="btn btn-outline"
                          onClick={() => setWorkflowPublished(workflow.id, !workflow.isPublished)}
                        >
                          {workflow.isPublished ? 'Unpublish' : 'Publish'}
                        </button>
                        <button type="button" className="btn-danger" onClick={() => deleteWorkflow(workflow.id)}>
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}
      </div>
    </section>
  );
}

export function WorkflowsPage() {
  const loadWorkflows = useWorkflowStore((state) => state.loadWorkflows);

  useEffect(() => {
    loadWorkflows();
  }, [loadWorkflows]);

  return (
    <div className="panel-stack">
      <header className="section-header">
        <div>
          <span className="section-eyebrow">Workflow</span>
          <h1>Workflows</h1>
          <p className="section-subtitle">Design, publish, and manage document processing workflows.</p>
        </div>
      </header>

      <WorkflowList />
    </div>
  );
}
