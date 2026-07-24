import httpClient from './httpClient.js';

// Matches the actual implemented backend routes (Patient Management Step 8): GET for the
// plain list, POST /search for filtered/searched queries - same GetAll/Search split
// already established by usersApi.js.
export function getPatients({ page, pageSize, sortBy, sortDirection, signal }) {
  return httpClient
    .get('/patients', { params: { page, pageSize, sortBy, sortDirection }, signal })
    .then((response) => response.data);
}

// nhi/firstName/lastName/dateOfBirth are discrete filters added for the Prescription
// module's Patient Search/Selection dialog - AND-combined with each other and with
// searchTerm/status/genderCode server-side when supplied (usp_Patient_Search). Optional
// on every existing caller (Patient Management's own List page never sends them).
export function searchPatients({
  searchTerm,
  status,
  genderCode,
  nhi,
  firstName,
  lastName,
  dateOfBirth,
  page,
  pageSize,
  sortBy,
  sortDirection,
  signal,
}) {
  return httpClient
    .post(
      '/patients/search',
      { searchTerm, status, genderCode, nhi, firstName, lastName, dateOfBirth, page, pageSize, sortBy, sortDirection },
      { signal },
    )
    .then((response) => response.data);
}

export function createPatient(payload) {
  return httpClient.post('/patients', payload).then((response) => response.data);
}

export function getPatientById(patientId) {
  return httpClient.get(`/patients/${patientId}`).then((response) => response.data);
}

export function updatePatient(patientId, payload) {
  return httpClient.put(`/patients/${patientId}`, payload).then((response) => response.data);
}

export function activatePatient(patientId) {
  return httpClient.put(`/patients/${patientId}/activate`).then((response) => response.data);
}

export function deactivatePatient(patientId) {
  return httpClient.put(`/patients/${patientId}/deactivate`).then((response) => response.data);
}
