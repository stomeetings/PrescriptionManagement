import httpClient from './httpClient.js';

// GET /api/prescriptions (Prescription Management List, no search/filter applied) -
// POST /prescriptions/search for filtered queries. Mirrors patientsApi.js's identical
// GetAll/Search split (same established convention as every other list module in this
// project).
// GET /api/prescriptions/{id} (Prescription Details) - full read-only view, including
// Xhtml for the page's own Preview/Print actions.
export function getPrescriptionDetails(prescriptionId, { signal } = {}) {
  return httpClient.get(`/prescriptions/${prescriptionId}`, { signal }).then((response) => response.data);
}

// GET /api/prescriptions/{id}/patient-medications (Patient Medication and Prescription
// Synchronization) - the Originating Patient Medication(s) for this prescription.
export function getOriginatingPatientMedications(prescriptionId) {
  return httpClient.get(`/prescriptions/${prescriptionId}/patient-medications`).then((response) => response.data);
}

// GET /api/prescriptions/items/{patientMedicationId}/active (Prescription Item
// Amendment & Replacement) - whether this medication belongs to an active, finalized
// prescription. hasActivePrescriptionItem=false is a normal result, not an error.
export function getActivePrescriptionItemForMedication(patientMedicationId) {
  return httpClient.get(`/prescriptions/items/${patientMedicationId}/active`).then((response) => response.data);
}

// POST /api/prescriptions/items/amend. Re-reads the current (already-saved)
// PatientMedication itself server-side - the caller must already have called
// updatePatientMedication before this, which is why the request carries no
// dose/frequency/etc. values of its own.
export function amendPrescriptionItem({ patientMedicationId, reason }) {
  return httpClient.post('/prescriptions/items/amend', { patientMedicationId, reason }).then((response) => response.data);
}

// POST /api/prescriptions/{id}/renew. selectedItems carries each chosen item's own
// (possibly clinician-edited) Quantity/Duration/Instructions - Medicine/Strength are
// never sent, since the backend never accepts them as input for a renewal at all.
export function renewPrescription(prescriptionId, { selectedItems }) {
  return httpClient.post(`/prescriptions/${prescriptionId}/renew`, { selectedItems }).then((response) => response.data);
}

// POST /api/prescriptions/{id}/cancel (Entire Prescription Cancellation). Invalidates the
// whole prescription and cascades every currently ACTIVE item to CANCELLED server-side -
// nothing is deleted, the prescription remains fully visible afterward.
export function cancelPrescription(prescriptionId, { cancellationType, reason, comments }) {
  return httpClient
    .post(`/prescriptions/${prescriptionId}/cancel`, { cancellationType, reason, comments })
    .then((response) => response.data);
}

// POST /api/prescriptions/{id}/reprint. The backend reuses the stored Xhtml/PDF snapshot
// exactly - nothing is regenerated from live data - and records the reprint (Reason/
// Copies/PrintedBy/PrintedDate) for the Timeline. `preview` only tells the caller's own
// UI whether to show the preview before printing; the backend accepts it purely to keep
// the request shape complete but doesn't act on it.
export function reprintPrescription(prescriptionId, { reason, copies, preview }) {
  return httpClient
    .post(`/prescriptions/${prescriptionId}/reprint`, { reason, copies, preview })
    .then((response) => response.data);
}

export function getPrescriptions({ page, pageSize, sortBy, sortDirection, signal }) {
  return httpClient
    .get('/prescriptions', { params: { page, pageSize, sortBy, sortDirection }, signal })
    .then((response) => response.data);
}

export function searchPrescriptions({
  searchTerm,
  statusCode,
  issueDateFrom,
  issueDateTo,
  expiryDateFrom,
  expiryDateTo,
  patientId,
  providerUserAccountId,
  page,
  pageSize,
  sortBy,
  sortDirection,
  signal,
}) {
  return httpClient
    .post(
      '/prescriptions/search',
      {
        searchTerm,
        statusCode,
        issueDateFrom,
        issueDateTo,
        expiryDateFrom,
        expiryDateTo,
        patientId,
        providerUserAccountId,
        page,
        pageSize,
        sortBy,
        sortDirection,
      },
      { signal },
    )
    .then((response) => response.data);
}

// POST /api/prescriptions/drafts (docs/prescriptions/database-spec.md, Step 18.4).
// providerId is not sent - the backend resolves the prescribing clinician from the
// authenticated caller's JWT, not a client-supplied field.
export function saveDraftPrescription({ draftPrescriptionId, patientId, xhtml, selectedPatientMedicationIds, clinicalNotes }) {
  return httpClient
    .post('/prescriptions/drafts', {
      draftPrescriptionId,
      patientId,
      xhtml,
      selectedPatientMedicationIds,
      clinicalNotes: clinicalNotes || null,
    })
    .then((response) => response.data);
}

// GET /api/prescriptions/drafts/{id}/pdf (Step 18.6). responseType: 'blob' - the
// backend returns a real application/pdf byte stream, never generated in React.
// prescriptionId is the real, persisted id returned by saveDraftPrescription, not the
// transient draftPrescriptionId used only during Generate/Preview.
export function downloadPrescriptionPdf(prescriptionId) {
  return httpClient
    .get(`/prescriptions/drafts/${prescriptionId}/pdf`, { responseType: 'blob' })
    .then((response) => response.data);
}

// PUT /api/prescriptions/drafts/{id} (Step 18.7's real minimal Edit). rowVersion is the
// base64 string the backend returned from the last Save Draft/Update call - required for
// optimistic concurrency, mirroring every other Update call's RowVersion convention in
// this project.
export function updateDraftPrescription(prescriptionId, { xhtml, selectedPatientMedicationIds, clinicalNotes, rowVersion }) {
  return httpClient
    .put(`/prescriptions/drafts/${prescriptionId}`, {
      xhtml,
      selectedPatientMedicationIds,
      clinicalNotes: clinicalNotes || null,
      rowVersion,
    })
    .then((response) => response.data);
}

// GET /api/prescriptions/drafts/{id}/versions (Step 18.7) - newest first, list view only.
export function getPrescriptionVersions(prescriptionId) {
  return httpClient.get(`/prescriptions/drafts/${prescriptionId}/versions`).then((response) => response.data);
}

// GET /api/prescriptions/drafts/{id}/versions/compare?from=&to= (Step 18.7). The diff
// itself is computed backend-side (PrescriptionVersionService.CompareAsync) - React only
// renders the already-categorized result.
export function comparePrescriptionVersions(prescriptionId, fromVersion, toVersion) {
  return httpClient
    .get(`/prescriptions/drafts/${prescriptionId}/versions/compare`, { params: { from: fromVersion, to: toVersion } })
    .then((response) => response.data);
}

// POST /api/prescriptions/drafts/{id}/versions/{version}/restore (Step 18.7). Creates a
// brand-new latest version from a historical snapshot - never overwrites history.
export function restorePrescriptionVersion(prescriptionId, versionNumber) {
  return httpClient
    .post(`/prescriptions/drafts/${prescriptionId}/versions/${versionNumber}/restore`)
    .then((response) => response.data);
}

// POST /api/prescriptions/drafts/{id}/finalize (Step 18.8). Locks the prescription as an
// official clinical document - the backend performs every validation (patient/provider
// active, medications active/no duplicates/directions complete, dates valid, not already
// finalized); this call either succeeds or throws a specific error, nothing is
// re-validated in React.
export function finalizePrescription(prescriptionId) {
  return httpClient.post(`/prescriptions/drafts/${prescriptionId}/finalize`).then((response) => response.data);
}

