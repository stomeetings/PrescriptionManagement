import httpClient from './httpClient.js';

// Matches the actual implemented backend routes (Medicine Management Step 11): GET for
// the plain list, POST /search for filtered/searched queries - same GetAll/Search split
// already established by usersApi.js/patientsApi.js.
export function getMedicines({ page, pageSize, sortBy, sortDirection, signal }) {
  return httpClient
    .get('/medicines', { params: { page, pageSize, sortBy, sortDirection }, signal })
    .then((response) => response.data);
}

export function searchMedicines({
  searchTerm,
  medicineFormCode,
  medicineRouteCode,
  status,
  isControlledDrug,
  page,
  pageSize,
  sortBy,
  sortDirection,
  signal,
}) {
  return httpClient
    .post(
      '/medicines/search',
      {
        searchTerm,
        medicineFormCode,
        medicineRouteCode,
        status,
        isControlledDrug,
        page,
        pageSize,
        sortBy,
        sortDirection,
      },
      { signal },
    )
    .then((response) => response.data);
}

export function createMedicine(payload) {
  return httpClient.post('/medicines', payload).then((response) => response.data);
}

export function getMedicineById(medicineId) {
  return httpClient.get(`/medicines/${medicineId}`).then((response) => response.data);
}

export function updateMedicine(medicineId, payload) {
  return httpClient.put(`/medicines/${medicineId}`, payload).then((response) => response.data);
}

export function activateMedicine(medicineId) {
  return httpClient.put(`/medicines/${medicineId}/activate`).then((response) => response.data);
}

export function deactivateMedicine(medicineId) {
  return httpClient.put(`/medicines/${medicineId}/deactivate`).then((response) => response.data);
}
