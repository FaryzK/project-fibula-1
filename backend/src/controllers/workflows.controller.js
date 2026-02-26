const {
  createWorkflow,
  deleteWorkflow,
  listWorkflows,
  updateWorkflow
} = require('../services/workflows.service');

function listUserWorkflows(req, res) {
  const workflows = listWorkflows(req.user.id);
  return res.status(200).json({ workflows });
}

function createUserWorkflow(req, res) {
  const workflow = createWorkflow(req.user.id, req.body || {});
  return res.status(201).json({ workflow });
}

function updateUserWorkflow(req, res) {
  const workflow = updateWorkflow(req.user.id, req.params.workflowId, req.body || {});

  if (!workflow) {
    return res.status(404).json({ error: 'Workflow not found' });
  }

  return res.status(200).json({ workflow });
}

function deleteUserWorkflow(req, res) {
  const isDeleted = deleteWorkflow(req.user.id, req.params.workflowId);

  if (!isDeleted) {
    return res.status(404).json({ error: 'Workflow not found' });
  }

  return res.status(204).send();
}

module.exports = {
  createUserWorkflow,
  deleteUserWorkflow,
  listUserWorkflows,
  updateUserWorkflow
};
