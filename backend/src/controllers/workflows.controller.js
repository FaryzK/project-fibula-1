const {
  createWorkflow,
  deleteWorkflow,
  listWorkflows,
  updateWorkflow
} = require('../services/workflows.service');

async function listUserWorkflows(req, res, next) {
  try {
    const workflows = await listWorkflows(req.user.id);
    return res.status(200).json({ workflows });
  } catch (error) {
    return next(error);
  }
}

async function createUserWorkflow(req, res, next) {
  try {
    const workflow = await createWorkflow(req.user.id, req.body || {});
    return res.status(201).json({ workflow });
  } catch (error) {
    return next(error);
  }
}

async function updateUserWorkflow(req, res, next) {
  try {
    const workflow = await updateWorkflow(req.user.id, req.params.workflowId, req.body || {});

    if (!workflow) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    return res.status(200).json({ workflow });
  } catch (error) {
    return next(error);
  }
}

async function deleteUserWorkflow(req, res, next) {
  try {
    const isDeleted = await deleteWorkflow(req.user.id, req.params.workflowId);

    if (!isDeleted) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  createUserWorkflow,
  deleteUserWorkflow,
  listUserWorkflows,
  updateUserWorkflow
};
