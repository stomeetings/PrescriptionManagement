import axios from 'axios';
import { getToken } from '../auth/tokenStorage.js';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5080/api';

const httpClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attaches the bearer token automatically for every request. authApi.js's own
// logout/getCurrentUser calls still pass a token explicitly (pre-dating this
// interceptor) - that's harmless duplication, not a conflict, and was left alone
// rather than editing already-approved Authentication frontend code in this step.
httpClient.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default httpClient;
