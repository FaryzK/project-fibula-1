import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useWorkflowStore } from '../stores/workflowStore';
import { CategorisationPromptsTab } from './tabs/CategorisationPromptsTab';
import { DataMapperTab } from './tabs/DataMapperTab';
import { DocumentFoldersTab } from './tabs/DocumentFoldersTab';
import { ExtractorsTab } from './tabs/ExtractorsTab';
import { ReconciliationTab } from './tabs/ReconciliationTab';
import { SplittingPromptsTab } from './tabs/SplittingPromptsTab';

const TABS = [
  { key: 'workflow', label: 'Workflow' },
  { key: 'document-folders', label: 'Document Folders' },
  { key: 'reconciliation', label: 'Reconciliation' },
  { key: 'document-splitting', label: 'Document Splitting' },
  { key: 'document-categorisation', label: 'Document Categorisation' },
  { key: 'extractors', label: 'Extractors' },
  { key: 'data-mapper', label: 'Data Mapper' }
];

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

  if (isLoading) {
    return (
      <section className="panel">
        <h2>Workflows</h2>
        <p>Loading workflows...</p>
      </section>
    );
  }

  return (
    <section className="panel">
      <h2>Workflows</h2>
      <p>Create and manage document processing workflows from one workspace.</p>

      <div className="panel-actions">
        <label htmlFor="new-workflow-name">New workflow name</label>
        <input
          id="new-workflow-name"
          type="text"
          value={newWorkflowName}
          onChange={(event) => setNewWorkflowName(event.target.value)}
        />
        <button type="button" onClick={handleCreateWorkflow}>
          Add Workflow
        </button>
      </div>

      {error ? <p className="status-error">{error}</p> : null}

      {workflows.length === 0 ? <p>No workflows yet.</p> : null}

      <ul>
        {workflows.map((workflow) => {
          const isEditing = editNamesById[workflow.id] !== undefined;

          return (
            <li key={workflow.id}>
              {isEditing ? (
                <>
                  <input
                    aria-label={`Rename ${workflow.name}`}
                    type="text"
                    value={editNamesById[workflow.id]}
                    onChange={(event) => changeRename(workflow.id, event.target.value)}
                  />
                  <button type="button" onClick={() => saveRename(workflow.id)}>
                    Save
                  </button>
                  <button type="button" onClick={() => cancelRename(workflow.id)}>
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <p>
                    <strong>{workflow.name}</strong> -{' '}
                    {workflow.isPublished ? 'Published' : 'Draft'}
                  </p>
                  <p>
                    <Link to={`/app/workflows/${workflow.id}/canvas`}>Open Canvas</Link>
                  </p>
                  <button type="button" onClick={() => beginRename(workflow)}>
                    Rename
                  </button>
                  <button
                    type="button"
                    onClick={() => setWorkflowPublished(workflow.id, !workflow.isPublished)}
                  >
                    {workflow.isPublished ? 'Unpublish' : 'Publish'}
                  </button>
                  <button type="button" onClick={() => deleteWorkflow(workflow.id)}>
                    Delete
                  </button>
                </>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function AppHomePage() {
  const user = useAuthStore((state) => state.user);
  const profile = useAuthStore((state) => state.profile);
  const signOut = useAuthStore((state) => state.signOut);
  const loadWorkflows = useWorkflowStore((state) => state.loadWorkflows);
  const [activeTab, setActiveTab] = useState('workflow');

  useEffect(() => {
    loadWorkflows();
  }, [loadWorkflows]);

  const activeTabContent = useMemo(() => {
    if (activeTab === 'workflow') {
      return <WorkflowList />;
    }

    if (activeTab === 'document-folders') {
      return <DocumentFoldersTab />;
    }

    if (activeTab === 'reconciliation') {
      return <ReconciliationTab />;
    }

    if (activeTab === 'document-splitting') {
      return <SplittingPromptsTab />;
    }

    if (activeTab === 'document-categorisation') {
      return <CategorisationPromptsTab />;
    }

    if (activeTab === 'extractors') {
      return <ExtractorsTab />;
    }

    return <DataMapperTab />;
  }, [activeTab]);

  return (
    <main className="app-shell">
      <header className="app-hero">
        <div>
          <span className="app-badge">PROJECT FIBULA-1</span>
          <h1>Workflow Tab</h1>
          <p className="app-subtitle">Signed in as {user?.email || 'unknown user'}.</p>
          <p className="app-subtitle">
            Name: {profile?.firstName || ''} {profile?.lastName || ''}
          </p>
        </div>
        <div className="app-hero-actions">
          <Link to="/app/settings">Go to User Settings</Link>
          <button type="button" onClick={signOut}>
            Logout
          </button>
        </div>
      </header>

      <nav aria-label="Landing tabs" className="tab-nav">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            aria-current={activeTab === tab.key ? 'page' : undefined}
          >
            {tab.label}
          </button>
        ))}
      </nav>
      {activeTabContent}
    </main>
  );
}
