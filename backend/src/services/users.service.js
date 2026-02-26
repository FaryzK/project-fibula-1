const profilesByUserId = new Map();

function getDefaultProfileFromUser(user) {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName || '',
    lastName: user.lastName || '',
    profileIconUrl: user.profileIconUrl || '',
    theme: user.theme || 'light'
  };
}

function getProfileForUser(user) {
  const storedProfile = profilesByUserId.get(user.id);
  return storedProfile || getDefaultProfileFromUser(user);
}

function validateProfileUpdate(payload) {
  if (payload.theme && payload.theme !== 'light' && payload.theme !== 'dark') {
    return 'Invalid theme. Use light or dark.';
  }

  return null;
}

function updateProfileForUser(user, payload) {
  const validationError = validateProfileUpdate(payload);

  if (validationError) {
    return {
      error: validationError
    };
  }

  const currentProfile = getProfileForUser(user);
  const nextProfile = {
    ...currentProfile,
    ...(payload.firstName !== undefined ? { firstName: payload.firstName } : {}),
    ...(payload.lastName !== undefined ? { lastName: payload.lastName } : {}),
    ...(payload.profileIconUrl !== undefined
      ? { profileIconUrl: payload.profileIconUrl }
      : {}),
    ...(payload.theme !== undefined ? { theme: payload.theme } : {})
  };

  profilesByUserId.set(user.id, nextProfile);

  return {
    profile: nextProfile
  };
}

module.exports = {
  getProfileForUser,
  updateProfileForUser
};
