import httpClient from './httpClient.js';

export function getLookupCategory(categoryCode) {
  return httpClient.get(`/lookups/${categoryCode}`).then((response) => response.data);
}
