const express = require('express');
const { requireAuth } = require('../middleware/require-auth.middleware');
const {
  getMyProfile,
  updateMyProfile
} = require('../controllers/users.controller');

const router = express.Router();

router.get('/me', requireAuth, getMyProfile);
router.patch('/me', requireAuth, updateMyProfile);

module.exports = router;
