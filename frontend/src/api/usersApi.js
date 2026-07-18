import httpClient from './httpClient.js';

// Matches the actual implemented backend routes (Step 8): GET for the plain list,
// POST /search for filtered/searched queries - not the single-GET design originally
// sketched in api-spec.md, which the backend deviated from during implementation.
export function getUsers({ page, pageSize, sortBy, sortDirection }) {
  return httpClient
    .get('/users', { params: { page, pageSize, sortBy, sortDirection } })
    .then((response) => response.data);
}

export function searchUsers({ searchTerm, roleCode, status, page, pageSize, sortBy, sortDirection }) {
  return httpClient
    .post('/users/search', { searchTerm, roleCode, status, page, pageSize, sortBy, sortDirection })
    .then((response) => response.data);
}

export function createUser(payload) {
  return httpClient.post('/users', payload).then((response) => response.data);
}

export function getUserById(userAccountId) {
  return httpClient.get(`/users/${userAccountId}`).then((response) => response.data);
}

export function updateUser(userAccountId, payload) {
  return httpClient.put(`/users/${userAccountId}`, payload).then((response) => response.data);
}

export function activateUser(userAccountId) {
  return httpClient.put(`/users/${userAccountId}/activate`).then((response) => response.data);
}

export function deactivateUser(userAccountId) {
  return httpClient.put(`/users/${userAccountId}/deactivate`).then((response) => response.data);
}

export function resetPassword(userAccountId) {
  return httpClient.put(`/users/${userAccountId}/reset-password`).then((response) => response.data);
}
