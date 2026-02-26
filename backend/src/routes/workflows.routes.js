const express = require('express');
const { requireAuth } = require('../middleware/require-auth.middleware');
const {
  createUserWorkflow,
  deleteUserWorkflow,
  listUserWorkflows,
  updateUserWorkflow
} = require('../controllers/workflows.controller');

const router = express.Router();

router.get('/', requireAuth, listUserWorkflows);
router.post('/', requireAuth, createUserWorkflow);
router.patch('/:workflowId', requireAuth, updateUserWorkflow);
router.delete('/:workflowId', requireAuth, deleteUserWorkflow);

module.exports = router;
