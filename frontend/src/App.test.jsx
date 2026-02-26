import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AppRoutes } from './App';
import { useAuthStore } from './stores/authStore';
import { useWorkflowStore } from './stores/workflowStore';

vi.mock('./services/workflowApi', () => ({
  listWorkflows: vi.fn().mockResolvedValue([])
}));

vi.mock('./services/configServiceNodesApi', () => ({
  listExtractors: vi.fn().mockResolvedValue([]),
  listDocumentFolders: vi.fn().mockResolvedValue([])
}));

vi.mock('./services/dataMapperReconciliationApi', () => ({
  listReconciliationRules: vi.fn().mockResolvedValue([]),
  listDataMapSets: vi.fn().mockResolvedValue([]),
  listDataMapRules: vi.fn().mockResolvedValue([])
}));

describe('App', () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    window.localStorage.clear();
    useAuthStore.setState({
      user: null,
      session: null,
      isLoading: false,
      hydrateSession: async () => {},
      startAuthListener: () => () => {},
      fetchProfile: async () => ({ profile: null, error: null }),
      updateProfile: async () => ({ profile: null, error: null }),
      signInWithGoogle: async () => ({ error: null }),
      signOut: async () => {}
    });

    useWorkflowStore.setState({
      workflows: [],
      isLoading: false,
      error: null,
      loadWorkflows: async () => ({ workflows: [], error: null }),
      createWorkflow: async () => ({ workflow: null, error: null }),
      renameWorkflow: async () => ({ workflow: null, error: null }),
      setWorkflowPublished: async () => ({ workflow: null, error: null }),
      deleteWorkflow: async () => ({ error: null }),
      newWorkflowName: '',
      setNewWorkflowName: () => {}
    });
  });

  it('redirects unauthenticated users to login screen', async () => {
    render(
      <MemoryRouter initialEntries={['/app']}>
        <AppRoutes />
      </MemoryRouter>
    );

    expect(await screen.findByRole('button', { name: /sign in with google/i })).toBeTruthy();
  });

  it('renders app home for authenticated users', async () => {
    useAuthStore.setState({
      user: { id: 'u1', email: 'user@example.com' },
      session: { access_token: 'token' },
      isLoading: false
    });

    render(
      <MemoryRouter initialEntries={['/app']}>
        <AppRoutes />
      </MemoryRouter>
    );

    expect(await screen.findByRole('heading', { name: /ops dashboard/i, level: 1 })).toBeTruthy();
  });

  it('shows loading state while auth session is hydrating', async () => {
    useAuthStore.setState({
      user: null,
      session: null,
      isLoading: true
    });

    render(
      <MemoryRouter initialEntries={['/login']}>
        <AppRoutes />
      </MemoryRouter>
    );

    expect(await screen.findByText(/completing sign-in/i)).toBeTruthy();
  });
});
