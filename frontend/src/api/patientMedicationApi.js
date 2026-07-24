import httpClient from './httpClient.js';

// GET /api/patient-medications/{id}/prescriptions (Patient Medication and Prescription
// Synchronization) - the full "Prescription History" section plus Medication Details'
// own Current Active Prescription/Last Prescription/Replacement Count/Print Count.
export function getPatientMedicationPrescriptionHistory(patientMedicationId) {
  return httpClient.get(`/patient-medications/${patientMedicationId}/prescriptions`).then((response) => response.data);
}

// GET /api/patients/{patientId}/medications (api-spec.md section 4.3) - current
// (Active) medications only, the default view for the Patient Medications tab.
export function getCurrentPatientMedications({ patientId, page, pageSize, sortBy, sortDirection, signal }) {
  return httpClient
    .get(`/patients/${patientId}/medications`, { params: { page, pageSize, sortBy, sortDirection }, signal })
    .then((response) => response.data);
}

// POST /api/patient-medications/search (api-spec.md section 4.5) - used instead of the
// plain GET above whenever a search term or filter is active, since usp_PatientMedication_
// GetCurrent has no searchTerm/statusCode/isPrn parameters of its own. Mirrors
// PatientListPage's getPatients-vs-searchPatients switch exactly.
export function searchPatientMedications({
  patientId,
  searchTerm,
  statusCode,
  isPrn,
  page,
  pageSize,
  sortBy,
  sortDirection,
  signal,
}) {
  return httpClient
    .post(
      '/patient-medications/search',
      { patientId, searchTerm, statusCode, isPrn, page, pageSize, sortBy, sortDirection },
      { signal },
    )
    .then((response) => response.data);
}

// POST /api/patient-medications (api-spec.md section 4.6).
export function createPatientMedication(payload) {
  return httpClient.post('/patient-medications', payload).then((response) => response.data);
}

// GET /api/patient-medications/{id} (api-spec.md section 4.2).
export function getPatientMedicationById(patientMedicationId) {
  return httpClient.get(`/patient-medications/${patientMedicationId}`).then((response) => response.data);
}

// PUT /api/patient-medications/{id} (api-spec.md section 4.7).
export function updatePatientMedication(patientMedicationId, payload) {
  return httpClient.put(`/patient-medications/${patientMedicationId}`, payload).then((response) => response.data);
}

// PUT /api/patient-medications/{id}/stop (api-spec.md section 4.9). StopMedicationRequest
// is intentionally empty - no StopDate/StopReason/Notes fields exist on the approved
// backend contract (EndDate is always stamped as today, server-side).
export function stopPatientMedication(patientMedicationId) {
  return httpClient.put(`/patient-medications/${patientMedicationId}/stop`, {}).then((response) => response.data);
}

// PUT /api/patient-medications/{id}/resume (api-spec.md section 4.10). id is the
// stopped source record; the response body is the NEW record created from it (its own,
// different patientMedicationId) - the source record itself is left unchanged.
export function resumePatientMedication(patientMedicationId, payload) {
  return httpClient.put(`/patient-medications/${patientMedicationId}/resume`, payload).then((response) => response.data);
}

// POST /api/patient-medications/generate-prescription (api-spec.md section 4.8, Xhtml/
// Provider fields added in Step 18.2 - see GeneratePrescriptionResponse.cs). Nothing is
// persisted by this call - see docs/prescriptions/prescription-management.md section
// 5.1.
export function generatePrescription({ patientId, selectedPatientMedicationIds, clinicalNotes, signal }) {
  return httpClient
    .post(
      '/patient-medications/generate-prescription',
      { patientId, selectedPatientMedicationIds, clinicalNotes: clinicalNotes || null },
      { signal },
    )
    .then((response) => response.data);
}
