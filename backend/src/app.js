const express = require('express');
const cors = require('cors');
const healthRouter = require('./routes/health.routes');
const authRouter = require('./routes/auth.routes');
const usersRouter = require('./routes/users.routes');
const workflowsRouter = require('./routes/workflows.routes');
const configServiceNodesRouter = require('./routes/config-service-nodes.routes');

const app = express();

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173' }));
app.use(express.json());

app.use('/api/health', healthRouter);
app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/workflows', workflowsRouter);
app.use('/api', configServiceNodesRouter);

module.exports = app;
