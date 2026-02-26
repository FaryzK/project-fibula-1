const express = require('express');
const cors = require('cors');
const healthRouter = require('./routes/health.routes');
const authRouter = require('./routes/auth.routes');
const usersRouter = require('./routes/users.routes');
const workflowsRouter = require('./routes/workflows.routes');
const webhooksRouter = require('./routes/webhooks.routes');
const configServiceNodesRouter = require('./routes/config-service-nodes.routes');
const dataMapperReconciliationRouter = require('./routes/data-mapper-reconciliation.routes');

const app = express();

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5174' }));
app.use(express.json());
app.use((error, _req, res, next) => {
  if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }

  return next(error);
});

app.use('/api/health', healthRouter);
app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/workflows', workflowsRouter);
app.use('/api/webhooks', webhooksRouter);
app.use('/api', configServiceNodesRouter);
app.use('/api', dataMapperReconciliationRouter);
app.use('/api', (_req, res) => {
  return res.status(404).json({ error: 'Not found' });
});
app.use((error, _req, res, _next) => {
  const statusCode = Number.isInteger(error.statusCode) ? error.statusCode : 500;
  const message = statusCode >= 500 ? 'Internal server error' : error.message;
  return res.status(statusCode).json({ error: message });
});

module.exports = app;
