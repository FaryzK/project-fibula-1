const express = require('express');
const { receiveWebhookController } = require('../controllers/webhooks.controller');

const router = express.Router();

router.post('/:workflowId/:nodeId', receiveWebhookController);

module.exports = router;
