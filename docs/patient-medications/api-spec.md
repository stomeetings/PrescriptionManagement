# Patient Medication Management — API Specification

**Feature:** Patient Medication Management
**Status:** Draft — pending approval
**Version:** 1.0
**Based on:** Patient Medication Management Business Specification v1.0 (approved), Database Design Specification v1.0 (approved)

---

# 1. API Overview

This document defines the REST API contract for Patient Medication Management. Design document only — no controllers, DTO classes, or entity classes, per scope.

**One endpoint in this task, `POST /api/patient-medications/generate-prescription`, reaches into territory that hasn't been specified yet.** Prescription Management has no Business Specification, Database Specification, or API Specification of its own at this point in the project — it is a future module. This document resolves that tension explicitly in §4.8 rather than silently inventing Prescription Management's schema: the endpoint returns a **transient, non-persisted draft** (no `Prescription` table exists to write to), and every field of its response that presumes something about the future module is flagged. This is the same kind of process-order tension already flagged for Medicine Management (business spec written after its database spec) — here it's more significant, since it touches a module that hasn't had *any* of its own specs approved, and should be revisited once Prescription Management's own Business Specification exists.

---

# 2. API Design Principles

- **Thin controllers**, delegating to an `IPatientMedicationService` — no SQL, no business rules, no direct repository access (to be built in later steps).
- **Two access shapes for the same underlying data**, matching the business spec's own §15 item 1 assumption: a cross-patient view (`GET /api/patient-medications`, `POST /api/patient-medications/search`) and a per-patient nested view (`GET /api/patients/{patientId}/medications`, `.../history`).
- **`PatientMedicationSummaryResponse` doubles as the list/search row shape.** This task names only three non-history, non-draft response DTOs beyond Summary/Detail (`PatientMedicationPagedResponse`, plus the two history/draft-specific ones) — no separate "List" response is requested, so `Summary` carries every column business spec §5.1 needs, the same resolution already made for Medicine Management's original (pre-Step-10) API spec.
- **Two distinct search mechanisms, not a redundant pair.** `GET /api/patient-medications` accepts a flat query-string `searchTerm` + simple filters, appropriate for a toolbar. `POST /api/patient-medications/search` ("Advanced search," per this task) accepts the richer `MedicationSearchRequest` body — multiple date ranges, multiple status values, cross-patient name/medicine/generic-name search combined — the kind of filter combination that doesn't fit cleanly in a query string. Both ultimately page/sort/filter the same data; which one a given screen uses is a UI-layer decision, not a duplicated backend concept.
- **Reuse over reinvention.** Error format and pagination envelope reuse Authentication's/User Management's/Patient Management's/Medicine Management's already-approved decisions.

```
PatientMedicationsController          (thin)
        ↓
IPatientMedicationService              (business rules: active-patient/active-medicine
                                        checks, duplicate-active check, Stop/Resume
                                        semantics, draft-prescription assembly)
        ↓
IPatientMedicationRepository
        ↓ Dapper
PatientMedication, PatientMedicationHistory, PatientMedicationStatus,
PatientMedicationSource, Patient, Medicine, DoseUnit, Frequency, DurationUnit
        ↓
SQL Server
```

---

# 3. Authentication & Authorization

Every endpoint requires a valid JWT. Matches the approved business spec §8 exactly — Administrator and Doctor share one full-access tier; Pharmacist and Receptionist share one view-only tier:

| Endpoint | Authentication | Authorization |
|---|---|---|
| `GET /api/patient-medications` | Required | Any authenticated role — View |
| `GET /api/patient-medications/{id}` | Required | Any authenticated role — View |
| `GET /api/patients/{patientId}/medications` | Required | Any authenticated role — View |
| `GET /api/patients/{patientId}/medications/history` | Required | Any authenticated role — View |
| `POST /api/patient-medications/search` | Required | Any authenticated role — View |
| `POST /api/patient-medications` | Required | `SYSTEM_ADMINISTRATOR`, `DOCTOR` |
| `POST /api/patient-medications/generate-prescription` | Required | `SYSTEM_ADMINISTRATOR`, `DOCTOR` |
| `PUT /api/patient-medications/{id}` | Required | `SYSTEM_ADMINISTRATOR`, `DOCTOR` |
| `PUT /api/patient-medications/{id}/stop` | Required | `SYSTEM_ADMINISTRATOR`, `DOCTOR` |
| `PUT /api/patient-medications/{id}/resume` | Required | `SYSTEM_ADMINISTRATOR`, `DOCTOR` |

Pharmacists and Receptionists cannot reach any write endpoint, matching this task's explicit "Only Doctors and Administrators can: Add, Edit, Stop, Resume, Generate Prescription."

---

# 4. Endpoints

## 4.1 `GET /api/patient-medications`

- **Purpose:** Cross-patient paginated list, with basic query-string search/filter/sort (business spec §5.1/§5.2/§5.3, cross-patient access pattern).
- **Query parameters:** `searchTerm` (matches Patient Name/Medicine Name/Generic Name), `statusCode` (`ACTIVE`/`STOPPED`), `isPrn` (bool), `page` (default `1`), `pageSize` (default `20`, max `100`), `sortBy` (default `createdDate`), `sortDirection` (default `desc`).
- **Response:** `PatientMedicationPagedResponse`.
- **Success:** `200 OK`. **Errors:** `400`, `401`.

## 4.2 `GET /api/patient-medications/{patientMedicationId}`

- **Purpose:** Full detail for one Patient Medication (business spec §5.6).
- **Response:** `PatientMedicationDetailResponse`.
- **Success:** `200 OK`. **Errors:** `401`, `404`.

## 4.3 `GET /api/patients/{patientId}/medications`

- **Purpose:** Current (Active) medications for one patient — the per-patient access pattern (business spec §5.1).
- **Query parameters:** `page`, `pageSize`, `sortBy`, `sortDirection` (same defaults as §4.1). Always implicitly filters `IsCurrent = true` — this endpoint never returns stopped entries; use `.../history` for those.
- **Response:** `PatientMedicationPagedResponse`.
- **Success:** `200 OK`. **Errors:** `401`, `404` (unknown `patientId`).

## 4.4 `GET /api/patients/{patientId}/medications/history`

- **Purpose:** The complete medication timeline for one patient — Active and every Stopped entry (business spec §5.9).
- **Response:** `PatientMedicationHistoryResponse`. **Deliberately exposes the row-per-Stop/Resume-cycle chain, not `PatientMedicationHistory`'s raw JSON audit-log entries** — see §6 for why, and the reasoning this carries forward from the approved database spec §3.2.
- **Query parameters:** `page`, `pageSize` (this can grow large per the approved database spec's own "large patient medication histories" NFR).
- **Success:** `200 OK`. **Errors:** `401`, `404`.

## 4.5 `POST /api/patient-medications/search`

- **Purpose:** "Advanced search" (per this task) — richer filter combinations than §4.1's query string comfortably supports.
- **Request DTO:** `MedicationSearchRequest`.
- **Response:** `PatientMedicationPagedResponse`.
- **Success:** `200 OK`. **Errors:** `400`, `401`.

## 4.6 `POST /api/patient-medications`

- **Purpose:** Add a medication to a patient's current list (business spec §5.4).
- **Request DTO:** `CreatePatientMedicationRequest`.
- **Business rules:**
  1. `patientId` must reference an **active** patient (business spec §6) — `422`, not `400` (see §7's status-code convention below).
  2. `medicineId` must reference an **active** medicine (business spec §6) — `422`.
  3. No existing **current** (`IsCurrent = true`) Patient Medication for the same `patientId` + `medicineId` (the approved database spec's filtered-unique-index rule) — `409`.
  4. `endDate`, if supplied, must not be before `startDate` — `400`.
  5. `patientMedicationSourceId` is **not** a client-supplied field on this endpoint — it is always set to `MANUAL_ENTRY` server-side, since this is the manual "Add Medication" screen, not an automated Prescription-triggered creation (which doesn't exist yet — see §4.8).
- **Success:** `201 Created`, `Location: /api/patient-medications/{patientMedicationId}`, body: `PatientMedicationDetailResponse`.
- **Errors:** `400`, `401`, `403`, `409`, `422`.

## 4.7 `PUT /api/patient-medications/{patientMedicationId}`

- **Purpose:** Edit an Active medication's editable fields (business spec §5.5).
- **Request DTO:** `UpdatePatientMedicationRequest`. **No `patientId`/`medicineId` fields at all** — both are immutable after creation; changing the medicine is a new medication, not an edit (business spec §5.5).
- **Business rules:** rejects the request outright if the target record is not Active/current (business spec §5.7 "stopped medications become read-only") — `409`, since this is a state conflict, not a missing-resource or validation failure. `rowVersion` must match — `409` on mismatch.
- **Success:** `200 OK`, body: `PatientMedicationDetailResponse`.
- **Errors:** `400`, `401`, `403`, `404`, `409`.

## 4.8 `POST /api/patient-medications/generate-prescription`

- **Purpose:** Assemble a **draft** payload from one or more selected current Patient Medications, for the future Prescription Management module's Create Prescription screen to consume (business spec §11.3).
- **Request DTO:** `GeneratePrescriptionRequest`.
- **What this endpoint does NOT do, explicitly:** it does not create, persist, or reserve any row in any `Prescription`-shaped table — none exists. Nothing about calling this endpoint changes any `PatientMedication` record (no Stop, no status change) — assembling a draft is non-destructive and repeatable.
- **Business rules:**
  1. `patientId` must reference an active patient — `422`.
  2. Every ID in `selectedPatientMedicationIds` must exist, belong to the given `patientId`, and currently be `IsCurrent = true` — a medication that was stopped between being selected in the UI and this call being made is **excluded from the draft, not treated as a hard failure**: it's reported back via `validationMessages` (§5, `GeneratePrescriptionResponse`) so the caller can inform the clinician, rather than failing the entire draft generation over one stale selection.
  3. If **none** of the requested IDs resolve to a valid, current medication, the endpoint returns `422` (nothing to draft) rather than a `200` with an empty selection.
- **Success:** `200 OK`, body: `GeneratePrescriptionResponse` (which may itself carry non-fatal `validationMessages` — see rule 2 above; a `200` does not mean every requested medication was included).
- **Errors:** `400`, `401`, `403`, `422`.

## 4.9 `PUT /api/patient-medications/{patientMedicationId}/stop`

- **Purpose:** Stop an Active medication (business spec §5.7).
- **Request DTO:** `StopMedicationRequest` — intentionally empty, matching the `ActivatePatientRequest`/`DeactivateMedicineRequest` no-body-action precedent. No "reason for stopping" field exists in the approved business spec; flagged as a possible Future Enhancement in Assumptions §9 item 4.
- **Business rules:** idempotent is **not** appropriate here (unlike Patient/Medicine Activate/Deactivate) — stopping an already-stopped medication is a `409` (a stopped record is read-only; there is nothing to stop), not a silent no-op.
- **Success:** `200 OK`, body: `PatientMedicationDetailResponse` (with `stoppedBy`/`stoppedDate` now populated).
- **Errors:** `401`, `403`, `404`, `409` (already stopped).

## 4.10 `PUT /api/patient-medications/{patientMedicationId}/resume`

- **Purpose:** Create a new Active medication record from a Stopped one (business spec §5.8 — **resolved as creating a new record, not reactivating the old one in place**, per the approved business spec's own reasoning).
- **Request DTO:** `ResumeMedicationRequest` — **unlike Stop/Activate/Deactivate, this is not an empty body.** Because Resume creates a new record pre-populated from the stopped one "as editable defaults" (business spec §5.8), every clinical field is present but **optional**: any field the caller omits is copied from the stopped source record; any field supplied overrides it. `startDate` is the one field that is effectively required in practice (defaults to "today" if omitted, per business spec §5.8, but is not itself copied from the old record's original `startDate`).
- **Business rules:** the target record must currently be Stopped — resuming an already-Active medication is `409`. The new record's duplicate-active check (rule 3 in §4.6) still applies, but is satisfied trivially in the common case (the stopped source record vacated the `IsCurrent` slot when it was stopped).
- **Success:** `201 Created`, `Location: /api/patient-medications/{newPatientMedicationId}`, body: `PatientMedicationDetailResponse` for the **new** record (its `resumedFromPatientMedicationId` populated, pointing at the stopped source).
- **Errors:** `400` (e.g. invalid overridden field), `401`, `403`, `404`, `409` (target not currently stopped).

---

# 5. Request Models

**`CreatePatientMedicationRequest`**
- `patientId` (int, required)
- `medicineId` (int, required)
- `dose` (decimal, required)
- `doseUnitCode` (string, required)
- `frequencyCode` (string, required)
- `duration` (int, required)
- `durationUnitCode` (string, required)
- `quantity` (decimal, required)
- `instructions` (string, required, max length 500)
- `prn` (bool, required)
- `startDate` (string, required, ISO 8601 date)
- `endDate` (string, optional, ISO 8601 date)
- `clinicalNotes` (string, optional)
- `prescribedByUserAccountId` (int, optional) — see §4.6 rule 5's note that this is independent of the authenticated caller (`createdBy`).

**`UpdatePatientMedicationRequest`** — identical to `CreatePatientMedicationRequest` minus `patientId`/`medicineId` (both structurally absent, immutable), plus `rowVersion` (string, required, base64-encoded `byte[]`).

**`StopMedicationRequest`** — intentionally empty.

**`ResumeMedicationRequest`**
- `startDate` (string, required, ISO 8601 date)
- `dose`, `doseUnitCode`, `frequencyCode`, `duration`, `durationUnitCode`, `quantity`, `instructions`, `prn`, `endDate`, `clinicalNotes` (all optional — omitted means "copy from the stopped source record," per §4.10).

**`MedicationFilterRequest`**
- `patientId` (int, nullable — scopes the search to one patient without using the nested route)
- `statusCode` (string, nullable)
- `isPrn` (bool, nullable)
- `startDateFrom` / `startDateTo` (date, nullable)
- `endDateFrom` / `endDateTo` (date, nullable)

**`MedicationSearchRequest` : `MedicationFilterRequest`**
- `searchTerm` (string, nullable — matches Patient Name/Medicine Name/Generic Name, business spec §5.2)
- `page` (int, default `1`), `pageSize` (int, default `20`), `sortBy` (string, default `createdDate`), `sortDirection` (string, default `desc`)

**`GeneratePrescriptionRequest`**
- `patientId` (int, required)
- `selectedPatientMedicationIds` (int[], required, at least one element)
- `clinicalNotes` (string, optional)

No new error DTO — reuses `ProblemDetails`/`ValidationProblemDetails`.

---

# 6. Response Models

**`PatientMedicationSummaryResponse`** *(doubles as the `PatientMedicationPagedResponse` row shape — see §2)*
- `patientMedicationId`, `patientId`, `patientNumber`, `patientFullName`
- `medicineId`, `medicineName`, `genericName`, `strength`
- `dosageForm` / `route` (small `{code, displayText}` objects, matching `MedicineFormResponse`/`MedicineRouteResponse`'s established shape)
- `dose`, `doseUnit` (`{code, displayText}`), `frequency` (`{code, displayText}`)
- `duration`, `durationUnit` (`{code, displayText}`)
- `quantity`, `prn`
- `startDate`, `endDate`
- `status` (`{code, displayText}` — `ACTIVE`/`STOPPED`)

**`PatientMedicationDetailResponse`** — everything in `Summary`, plus:
- `instructions`, `clinicalNotes`
- `prescribedBy` (`{userAccountId, fullName}`, nullable)
- `source` (`{code, displayText}`)
- `isCurrent`
- `resumedFromPatientMedicationId` (nullable)
- `createdDate`, `createdBy`, `updatedDate`, `updatedBy`, `stoppedDate`, `stoppedBy`
- `rowVersion`

**`PatientMedicationPagedResponse`**
- `items` (`PatientMedicationSummaryResponse[]`), `page`, `pageSize`, `totalCount`, `totalPages`

**`PatientMedicationHistoryResponse`**
- `patientId`, `patientNumber`, `patientFullName`
- `entries` (`PatientMedicationSummaryResponse[]`, ordered chronologically, including both Active and Stopped rows — **not** the raw `PatientMedicationHistory` JSON audit-log entries, see §4.4)

**`GeneratePrescriptionResponse`**
- `draftPrescriptionId` (string, GUID) — **a transient correlation identifier generated fresh on each call, not a persisted database key.** No `Prescription` table exists yet for this to reference; flagged prominently since this is the field most likely to be misread as "a prescription now exists somewhere."
- `patient` (`{patientId, patientNumber, fullName}`)
- `selectedMedicines` (`PatientMedicationSummaryResponse[]` — only the entries that actually passed validation and were included; may be fewer than requested, see §4.8 rule 2)
- `validationMessages` (`string[]`, empty if none — non-fatal notices, e.g. "Medication X was stopped and could not be included.")

---

# 7. Validation Rules

| Rule | Status code |
|---|---|
| `patientId` must reference an active patient | `422` |
| `medicineId` must reference an active medicine | `422` |
| Duplicate active medication (same patient + medicine already current) | `409` |
| `endDate` before `startDate` | `400` |
| Required fields missing (dose, doseUnitCode, frequencyCode, duration, durationUnitCode, quantity, instructions, prn, startDate) | `400` |
| Unknown/inactive `doseUnitCode`/`frequencyCode`/`durationUnitCode` | `400` |
| Stopping an already-stopped medication | `409` |
| Resuming an already-active medication | `409` |
| Editing a stopped (non-current) medication | `409` |
| `rowVersion` mismatch | `409` |

**New convention introduced by this module, not used identically in Patient/Medicine Management: `422 Unprocessable Entity` is reserved specifically for "the referenced entity exists and is structurally valid, but is not in an eligible state for this operation"** (inactive patient, inactive medicine) — distinct from `400` ("the request itself is malformed or references something that doesn't exist/resolve at all") and `409` ("the request is valid and the referenced entities are eligible, but completing it would violate a uniqueness or concurrency rule"). Patient/Medicine Management didn't need this three-way split because neither had a "referenced entity exists but is in the wrong state" case at Create time the way this module's active-patient/active-medicine checks do. Flagged as a genuinely new pattern, not an inconsistency to silently resolve.

---

# 8. Error Responses

Reuses the existing RFC 7807 `ProblemDetails`/`ValidationProblemDetails` format.

**Example — inactive patient (`422`):**
```json
{
  "type": "https://tools.ietf.org/html/rfc7231#section-6.5.1",
  "title": "Patient is not active.",
  "status": 422,
  "detail": "Medications cannot be added for an inactive patient.",
  "instance": "/api/patient-medications",
  "traceId": "00-...-00"
}
```

**Example — duplicate active medication (`409`):**
```json
{
  "type": "https://tools.ietf.org/html/rfc7231#section-6.5.8",
  "title": "This patient already has an active medication for this medicine.",
  "status": 409,
  "detail": "Patient 42 already has a current medication record for Medicine 17.",
  "instance": "/api/patient-medications",
  "traceId": "00-...-00"
}
```

---

# 9. HTTP Status Codes

| Code | Used by |
|---|---|
| `200 OK` | Both `GET`s, both `POST /search`-style reads, `PUT` (update/stop), `POST generate-prescription` |
| `201 Created` | `POST /api/patient-medications`, `PUT .../resume` (creates a new record) |
| `400 Bad Request` | Structural validation failures |
| `401 Unauthorized` | Missing/invalid/expired JWT |
| `403 Forbidden` | Valid JWT, role not permitted (Pharmacist/Receptionist on any write endpoint) |
| `404 Not Found` | Unknown `patientMedicationId`/`patientId` |
| `409 Conflict` | Duplicate active medication, stop/resume state conflicts, stale `rowVersion` |
| `422 Unprocessable Entity` | Inactive patient/medicine referenced; a `generate-prescription` call where nothing selectable remains |
| `500 Internal Server Error` | Unhandled failure — generic `ProblemDetails`, no exception detail |

---

# 10. Pagination

Implemented on `GET /api/patient-medications`, `GET /api/patients/{patientId}/medications`, `.../history`, and `POST /api/patient-medications/search`, all via `page`/`pageSize`/`sortBy`/`sortDirection`. `pageSize` capped at 100. Given the approved database spec's explicit "large patient medication histories" NFR, the `.../history` endpoint is the one most likely to need pagination in practice, not just support it in principle.

---

# 11. Versioning Strategy

No `/api/v1` prefix — consistent with every other module.

---

# 12. Security Considerations

- **Highest PHI sensitivity in the project so far** — `instructions`/`clinicalNotes` carry clinical detail beyond even Patient Management's demographic data. Standard discipline (log IDs, never full field content) applies with extra emphasis, per the approved database spec §7.
- Write access enforced at the API layer (Administrator/Doctor only), not only hidden in the UI.
- `generate-prescription`'s draft is never persisted, which also means it carries no independent access-control surface of its own to worry about (no one can later "look up" a draft by ID from a different session, since nothing is stored).

---

# 13. Performance Considerations

- Pagination is server-side throughout; `pageSize` capped at 100.
- The approved database spec's filtered unique index keeps the duplicate-active check (§4.6 rule 3) cheap regardless of a patient's total historical row count.
- Leading-wildcard search (Patient Name/Medicine Name/Generic Name) carries the same already-documented scan caveat as Patient/Medicine Management — not resolved here, carried forward.

---

# 14. Swagger / OpenAPI Documentation Requirements

- `[ProducesResponseType]` per action for every status code it can return, including the new `422` case.
- XML doc comments on every action, with particular care on `generate-prescription` to state plainly in the summary that no `Prescription` is created.
- As already flagged for Patient Management and Medicine Management: this project still has **no Swagger/OpenAPI package or middleware registered anywhere** — not something this document can resolve.

---

# 15. Future Compatibility

- **Prescription Management** — `generate-prescription`'s response shape (`Patient`, `SelectedMedicines`, `ValidationMessages`) is intended as a starting sketch for what that future module's Create Prescription screen will consume, not a final contract — it should be revisited once Prescription Management has its own approved Business Specification, which may well change this shape.
- **NZ ePrescription** — not addressed here, matching the database spec's own explicit deferral (no external reference-number field exists yet); this API surface would need new fields/endpoints once that integration is actually scoped.
- **Audit History** — `PatientMedicationHistory`'s raw JSON audit log is **not exposed by any endpoint in this specification** (§4.4's note) — a future compliance/audit-review feature would need a dedicated endpoint, deliberately not designed speculatively here.
- **Medication Reconciliation** — `PatientMedicationSourceId`'s `IMPORTED` value (approved database spec §3.4) has no corresponding import endpoint in this specification; reconciliation workflows are future scope.

---

# 16. Assumptions Requiring Clarification

1. **`generate-prescription`'s entire response contract is provisional**, since it presumes the shape of a not-yet-specified module — the single biggest open item in this document (see §1).
2. **`doseUnitCode`/`frequencyCode`/`durationUnitCode` are passed as lookup codes**, resolved to IDs at the Service layer, mirroring `Patient`'s `genderCode`/Medicine's `dosageFormCode` precedent — not literally specified by this task, but consistent with every prior module's DTO design.
3. **`GET /api/patient-medications`'s query-string search is a plain, simpler sibling of `POST /search`'s richer body**, not a redundant duplicate — confirm this reading matches intent, since the task lists both without explicitly contrasting them.
4. **No "reason for stopping" field exists on `StopMedicationRequest`** — the approved business spec never mentions one; flagged as a plausible Future Enhancement, not added speculatively here.
5. **The new `422` status code's scope is deliberately narrow** (state-ineligibility only) to avoid it silently absorbing cases `400`/`409` already handle well in every other module — confirm this three-way split is wanted before implementation, since it's a first for this project.
