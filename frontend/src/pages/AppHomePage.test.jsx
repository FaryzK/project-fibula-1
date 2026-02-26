import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AppHomePage } from './AppHomePage';
import { useAuthStore } from '../stores/authStore';
import { useWorkflowStore } from '../stores/workflowStore';
import {
  createWorkflow,
  deleteWorkflow,
  listWorkflows,
  updateWorkflow
} from '../services/workflowApi';
import {
  listCategorisationPrompts,
  listDocumentFolders,
  listExtractors,
  listSplittingPrompts
} from '../services/configServiceNodesApi';
import {
  listDataMapRules,
  listDataMapSets,
  listMatchingSets,
  listReconciliationRules
} from '../services/dataMapperReconciliationApi';

vi.mock('../services/workflowApi', () => ({
  listWorkflows: vi.fn(),
  createWorkflow: vi.fn(),
  updateWorkflow: vi.fn(),
  deleteWorkflow: vi.fn()
}));

vi.mock('../services/configServiceNodesApi', () => ({
  listSplittingPrompts: vi.fn(),
  createSplittingPrompt: vi.fn(),
  updateSplittingPrompt: vi.fn(),
  deleteSplittingPrompt: vi.fn(),
  listCategorisationPrompts: vi.fn(),
  createCategorisationPrompt: vi.fn(),
  updateCategorisationPrompt: vi.fn(),
  deleteCategorisationPrompt: vi.fn(),
  listDocumentFolders: vi.fn(),
  createDocumentFolder: vi.fn(),
  updateDocumentFolder: vi.fn(),
  deleteDocumentFolder: vi.fn(),
  sendOutFromFolder: vi.fn(),
  listExtractors: vi.fn(),
  createExtractor: vi.fn(),
  updateExtractor: vi.fn(),
  deleteExtractor: vi.fn()
}));

vi.mock('../services/dataMapperReconciliationApi', () => ({
  listDataMapSets: vi.fn(),
  createDataMapSet: vi.fn(),
  updateDataMapSet: vi.fn(),
  deleteDataMapSet: vi.fn(),
  listDataMapRules: vi.fn(),
  createDataMapRule: vi.fn(),
  updateDataMapRule: vi.fn(),
  deleteDataMapRule: vi.fn(),
  listReconciliationRules: vi.fn(),
  createReconciliationRule: vi.fn(),
  updateReconciliationRule: vi.fn(),
  deleteReconciliationRule: vi.fn(),
  listMatchingSets: vi.fn(),
  createMatchingSet: vi.fn(),
  forceReconcileMatchingSet: vi.fn(),
  rejectMatchingSet: vi.fn()
}));

describe('AppHomePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listSplittingPrompts.mockResolvedValue([]);
    listCategorisationPrompts.mockResolvedValue([]);
    listDocumentFolders.mockResolvedValue([]);
    listExtractors.mockResolvedValue([]);
    listDataMapSets.mockResolvedValue([]);
    listDataMapRules.mockResolvedValue([]);
    listReconciliationRules.mockResolvedValue([]);
    listMatchingSets.mockResolvedValue([]);

    useAuthStore.setState({
      user: { id: 'user_1', email: 'user@example.com' },
      profile: {
        firstName: 'Ada',
        lastName: 'Lovelace'
      },
      signOut: async () => {}
    });

    useWorkflowStore.setState({
      workflows: [],
      isLoading: false,
      error: null
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('loads workflows and renders workflow tab by default', async () => {
    listWorkflows.mockResolvedValueOnce([]);

    render(
      <MemoryRouter>
        <AppHomePage />
      </MemoryRouter>
    );

    expect(await screen.findByRole('heading', { name: /workflows/i, level: 1 })).toBeTruthy();
    expect(screen.getByRole('button', { name: /add workflow/i })).toBeTruthy();
    expect(listWorkflows).toHaveBeenCalledTimes(1);
  });

  it('supports create, publish and delete actions', async () => {
    listWorkflows.mockResolvedValueOnce([]);
    createWorkflow.mockResolvedValueOnce({
      id: 'wf_1',
      name: 'Invoice Flow',
      isPublished: false,
      createdAt: '2026-02-26T00:00:00.000Z',
      updatedAt: '2026-02-26T00:00:00.000Z'
    });
    updateWorkflow.mockResolvedValueOnce({
      id: 'wf_1',
      name: 'Invoice Flow',
      isPublished: true,
      createdAt: '2026-02-26T00:00:00.000Z',
      updatedAt: '2026-02-26T00:01:00.000Z'
    });
    deleteWorkflow.mockResolvedValueOnce();

    render(
      <MemoryRouter>
        <AppHomePage />
      </MemoryRouter>
    );

    fireEvent.change(await screen.findByLabelText(/workflow name/i), {
      target: { value: 'Invoice Flow' }
    });
    fireEvent.click(screen.getByRole('button', { name: /add workflow/i }));

    expect(await screen.findByText(/invoice flow/i)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /publish/i }));

    await waitFor(() => {
      expect(screen.getByText(/published/i)).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: /delete/i }));

    await waitFor(() => {
      expect(screen.queryByText(/invoice flow/i)).toBeNull();
    });
  });
});
