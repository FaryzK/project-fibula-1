import { create } from 'zustand';
import {
  createWorkflow as createWorkflowRequest,
  deleteWorkflow as deleteWorkflowRequest,
  listWorkflows as listWorkflowsRequest,
  updateWorkflow as updateWorkflowRequest
} from '../services/workflowApi';

export const useWorkflowStore = create((set, get) => ({
  workflows: [],
  isLoading: false,
  error: null,
  newWorkflowName: '',

  setNewWorkflowName: (value) => {
    set({ newWorkflowName: value });
  },

  loadWorkflows: async () => {
    set({ isLoading: true, error: null });

    try {
      const workflows = await listWorkflowsRequest();
      set({ workflows, isLoading: false });
      return { workflows, error: null };
    } catch (error) {
      set({ isLoading: false, error: 'Failed to load workflows' });
      return { workflows: [], error };
    }
  },

  createWorkflow: async (payload) => {
    try {
      const workflow = await createWorkflowRequest(payload);
      const workflows = [...get().workflows, workflow];
      set({ workflows, newWorkflowName: '' });
      return { workflow, error: null };
    } catch (error) {
      set({ error: 'Failed to create workflow' });
      return { workflow: null, error };
    }
  },

  renameWorkflow: async (workflowId, nextName) => {
    try {
      const workflow = await updateWorkflowRequest(workflowId, { name: nextName });
      const workflows = get().workflows.map((item) => (item.id === workflow.id ? workflow : item));
      set({ workflows });
      return { workflow, error: null };
    } catch (error) {
      set({ error: 'Failed to rename workflow' });
      return { workflow: null, error };
    }
  },

  setWorkflowPublished: async (workflowId, isPublished) => {
    try {
      const workflow = await updateWorkflowRequest(workflowId, { isPublished });
      const workflows = get().workflows.map((item) => (item.id === workflow.id ? workflow : item));
      set({ workflows });
      return { workflow, error: null };
    } catch (error) {
      set({ error: 'Failed to update workflow status' });
      return { workflow: null, error };
    }
  },

  deleteWorkflow: async (workflowId) => {
    try {
      await deleteWorkflowRequest(workflowId);
      const workflows = get().workflows.filter((item) => item.id !== workflowId);
      set({ workflows });
      return { error: null };
    } catch (error) {
      set({ error: 'Failed to delete workflow' });
      return { error };
    }
  }
}));
