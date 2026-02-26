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

vi.mock('../services/workflowApi', () => ({
  listWorkflows: vi.fn(),
  createWorkflow: vi.fn(),
  updateWorkflow: vi.fn(),
  deleteWorkflow: vi.fn()
}));

describe('AppHomePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();

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

    expect(await screen.findByRole('heading', { name: /workflow tab/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /add workflow/i })).toBeTruthy();
    expect(listWorkflows).toHaveBeenCalledTimes(1);
  });

  it('switches to document folders tab', async () => {
    listWorkflows.mockResolvedValueOnce([]);

    render(
      <MemoryRouter>
        <AppHomePage />
      </MemoryRouter>
    );

    const docFolderTab = await screen.findByRole('button', { name: /document folders/i });
    fireEvent.click(docFolderTab);

    expect(screen.getByText(/document folders content coming in phase 5/i)).toBeTruthy();
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

    fireEvent.change(await screen.findByLabelText(/new workflow name/i), {
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
