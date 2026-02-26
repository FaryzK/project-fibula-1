const express = require('express');

const router = express.Router();
const REQUIRED_ENV_VARS = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_JWT_SECRET'];

function findMissingEnvVars() {
  return REQUIRED_ENV_VARS.filter((key) => !process.env[key]);
}

router.get('/', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

router.get('/readiness', (_req, res) => {
  const missingEnvVars = findMissingEnvVars();

  if (missingEnvVars.length) {
    return res.status(503).json({
      status: 'degraded',
      ready: false,
      missingEnvVars
    });
  }

  return res.status(200).json({
    status: 'ok',
    ready: true,
    missingEnvVars: []
  });
});

module.exports = router;
