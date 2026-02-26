const { receiveWebhookEvent } = require('../services/webhooks.service');

function receiveWebhookController(req, res) {
  const result = receiveWebhookEvent({
    workflowId: req.params.workflowId,
    nodeId: req.params.nodeId,
    mode: req.query.mode,
    targetNodeId: req.query.targetNodeId,
    body: req.body || {}
  });

  return res.status(202).json(result);
}

module.exports = {
  receiveWebhookController
};
