const {
  getProfileForUser,
  updateProfileForUser
} = require('../services/users.service');

function getMyProfile(req, res) {
  const profile = getProfileForUser(req.user);
  return res.status(200).json({ profile });
}

function updateMyProfile(req, res) {
  const result = updateProfileForUser(req.user, req.body || {});

  if (result.error) {
    return res.status(400).json({ error: result.error });
  }

  return res.status(200).json({ profile: result.profile });
}

module.exports = {
  getMyProfile,
  updateMyProfile
};
