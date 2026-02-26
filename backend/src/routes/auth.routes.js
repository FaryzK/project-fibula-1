const express = require('express');
const { getCurrentUser } = require('../controllers/auth.controller');
const { requireAuth } = require('../middleware/require-auth.middleware');

const router = express.Router();

router.get('/me', requireAuth, getCurrentUser);

module.exports = router;
