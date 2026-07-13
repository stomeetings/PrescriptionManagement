import httpClient from './httpClient.js';

export function login(username, password) {
  return httpClient
    .post('/auth/login', { username, password })
    .then((response) => response.data);
}

export function logout(token) {
  return httpClient
    .post('/auth/logout', null, {
      headers: { Authorization: `Bearer ${token}` },
    })
    .then((response) => response.data);
}

export function getCurrentUser(token) {
  return httpClient
    .get('/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    })
    .then((response) => response.data);
}
