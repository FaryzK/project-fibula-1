import api from './api';

export async function getMyProfile() {
  const response = await api.get('/users/me');
  return response.data.profile;
}

export async function patchMyProfile(payload) {
  const response = await api.patch('/users/me', payload);
  return response.data.profile;
}
