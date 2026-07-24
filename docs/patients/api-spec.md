# Patient Management — API Specification

**Feature:** Patient Management
**Status:** Draft — pending approval
**Version:** 1.0
**Based on:** Patient Management Business Specification v1.0 (approved), Patient Management Database Design Specification v1.0 (approved), User Management API Specification v1.0 (approved — pattern reused, not redesigned)

---

# 1. API Overview

This document defines the REST API contract for Patient Management: listing/searching/filtering patients, viewing details, creating, editing, and activating/deactivating. Design document only — no controllers, DTO classes, service/repository implementations, or SQL, per scope.

**Endpoint shape and conventions are deliberately copied from User Management's actual implementation** (`GET` for the plain list, `POST /search` for filtered search, `PUT` for update/activate/deactivate) rather than User Management's originally-*approved*-then-superseded api-spec (which had sketched a single unified `GET`). Matching what was actually built and shipped is more useful consistency than matching a paper design that was later deviated from.

Seven endpoints are in scope, covering all eight requested operations — "Filter patients" is folded into the same `POST /api/patients/search` endpoint as "Search patients," for the same reason User Management merged them: they're the same underlying operation with different inputs, and three overlapping endpoints would only duplicate pagination/sorting logic.

---

# 2. API Design Principles

- **Thin controllers**, delegating to an `IPatientService` — no SQL, no business rules, no direct repository access.
- **Multi-role authorization, a first for this project.** Every prior module (Lookup Management, User Management) ended up with a single required role per endpoint. Patient Management is the first to need genuine multi-role checks (e.g., `[Authorize(Roles = "SYSTEM_ADMINISTRATOR,DOCTOR,RECEPTIONIST")]`) — still using the same `Roles` constants class, just combined.
- **`PatientNumber` is never client-supplied**, not on Create, not on Update — it's generated server-side from the database `SEQUENCE` (per the approved database spec) and returned in the response, never accepted as input.
- **Reuse over reinvention.** Gender reuses the existing `RoleResponse`-shaped pattern (a `{code, displayText}` pair) rather than inventing a new lookup DTO shape; error format, pagination envelope shape, and versioning strategy all reuse Authentication's/User Management's already-approved decisions.

```
PatientsController              (thin — 7 actions)
        ↓
IPatientService                  (business rules: uniqueness handling, DOB validation,
                                  gender validation, PatientNumber generation trigger)
        ↓
IPatientRepository
        ↓ Dapper
usp_Patient_GetAll / usp_Patient_Search / usp_Patient_GetById / usp_Patient_Create /
usp_Patient_Update / usp_Patient_Activate / usp_Patient_Deactivate
        ↓
Patient, Gender   (SQL Server)
```

---

# 3. Authentication & Authorization

Every endpoint requires a valid JWT (Authentication's existing scheme, unchanged). Unlike User Management (Administrator-only, uniformly), Patient Management's role requirements vary **per endpoint**, matching the approved business spec's authorization matrix (§7) exactly:

| Endpoint | Authentication | Authorization |
|---|---|---|
| `GET /api/patients` | Required | Any authenticated role (Administrator, Doctor, Receptionist, Pharmacist) — View |
| `GET /api/patients/{id}` | Required | Any authenticated role — View |
| `POST /api/patients/search` | Required | Any authenticated role — View |
| `POST /api/patients` | Required | `SYSTEM_ADMINISTRATOR`, `DOCTOR`, `RECEPTIONIST` — Create |
| `PUT /api/patients/{id}` | Required | `SYSTEM_ADMINISTRATOR`, `DOCTOR`, `RECEPTIONIST` — Update |
| `PUT /api/patients/{id}/activate` | Required | `SYSTEM_ADMINISTRATOR` only |
| `PUT /api/patients/{id}/deactivate` | Required | `SYSTEM_ADMINISTRATOR` only |

**Pharmacists get View only, matching the business spec exactly** — no Create/Update/Activate/Deactivate access. Activate/Deactivate being Administrator-only resolves the gap flagged during the business-spec review (Doctors/Receptionists have Create/Update but were never explicitly granted or denied Activate/Deactivate — this task's Authorization section now answers that explicitly).

---

# 4. Endpoints

## 4.1 `GET /api/patients`

- **Purpose:** Paginated list of all patients, no filters.
- **Query parameters:** `page` (default `1`), `pageSize` (default `20`, max `100`), `sortBy` (default `createdDate`; one of `fullName`, `patientNumber`, `dateOfBirth`, `gender`, `status`, `createdDate`), `sortDirection` (default `desc`).
- **Response:** `PatientPagedResponse`.
- **Success:** `200 OK`. **Errors:** `400` (invalid `page`/`pageSize`/`sortBy`), `401`.

## 4.2 `GET /api/patients/{patientId}`

- **Purpose:** Full detail for one patient (business spec §4.6 — "display all patient demographic information").
- **Response:** `PatientDetailResponse`.
- **Success:** `200 OK`. **Errors:** `401`, `404`.

## 4.3 `POST /api/patients/search`

- **Purpose:** Search and filter patients in one paginated call (business spec §4.2 + §4.3 combined).
- **Request DTO:** `PatientSearchRequest` — `searchTerm` (matched against `PatientNumber`/`FirstName`/`LastName`/`MobileNumber`/`Email`/`NHINumber`, per §4.2's exact field list), `status` (`"Active"`/`"Inactive"`, §4.3), `genderCode` (§4.3), plus `page`/`pageSize`/`sortBy`/`sortDirection`.
- **Response:** `PatientPagedResponse`.
- **Success:** `200 OK`. **Errors:** `400`, `401`.

## 4.4 `POST /api/patients`

- **Purpose:** Register a new patient (business spec §4.4).
- **Request DTO:** `CreatePatientRequest`.
- **Business rules:**
  1. `PatientNumber` is generated server-side (database `SEQUENCE`) — never accepted from the client.
  2. `genderCode` must match an existing, active `Gender.Code`.
  3. `dateOfBirth` cannot be in the future (business spec §5) — the "at least one day old" rule flagged during the business-spec review as a possible newborn-exclusion bug is **not enforced here**, pending that confirmation (matches the database spec's own decision not to hard-code it).
  4. `nhiNumber`, if supplied, must be unique.
- **Success:** `201 Created`, `Location: /api/patients/{patientId}`, body: `PatientDetailResponse`.
- **Errors:** `400` (validation, invalid gender), `401`, `403`, `409` (duplicate NHI number).

## 4.5 `PUT /api/patients/{patientId}`

- **Purpose:** Edit an existing patient's editable fields (business spec §4.5).
- **Request DTO:** `UpdatePatientRequest` — **no `patientNumber` field exists on this DTO at all**, matching User Management's precedent for `Username` (immutable, structurally absent, not merely ignored if sent).
- **Business rules:** same gender/DOB/NHI-uniqueness rules as Create; `rowVersion` must match the current database value (optimistic concurrency, per the approved database spec).
- **Success:** `200 OK`, body: `PatientDetailResponse` (with the new `rowVersion`).
- **Errors:** `400`, `401`, `403`, `404`, `409` (duplicate NHI number on change, or stale `rowVersion`).

## 4.6 `PUT /api/patients/{patientId}/activate`

- **Purpose:** Set a patient's status to Active.
- **Request DTO:** none. **Idempotent** — activating an already-active patient succeeds without error.
- **Success:** `200 OK`, body: `PatientDetailResponse`.
- **Errors:** `401`, `403`, `404`.

## 4.7 `PUT /api/patients/{patientId}/deactivate`

- **Purpose:** Set a patient's status to Inactive (business spec §4.8 — "inactive patients cannot receive new prescriptions").
- **Request DTO:** none. **Idempotent** for an already-inactive patient.
- **Success:** `200 OK`, body: `PatientDetailResponse`.
- **Errors:** `401`, `403`, `404`.

---

# 5. Request Parameters

Covered per-endpoint in §4. Pagination/search/filter/sort parameters (`GET /api/patients` and `POST /api/patients/search`): `page`, `pageSize`, `sortBy`, `sortDirection`, plus (search only) `searchTerm`, `status`, `genderCode`.

---

# 6. Response Models

**`GenderResponse`**
- `code` (string)
- `displayText` (string)

*(Mirrors `RoleResponse`'s shape exactly, for the same reason `RoleResponse` mirrored `LookupValueResponse` — project-wide consistency for `{code, displayText}` reference pairs.)*

**`PatientListResponse`** *(one row in `GET /api/patients` / `POST /api/patients/search`)*
- `patientId` (int)
- `patientNumber` (string)
- `fullName` (string — **computed** from `firstName + " " + lastName` at the mapping layer; not a stored column, unlike `UserAccount.FullName`, since nothing here needs backward compatibility with an existing stored value)
- `dateOfBirth` (string, ISO 8601 date)
- `gender` (`GenderResponse`)
- `mobileNumber` (string, nullable)
- `email` (string, nullable)
- `nhiNumber` (string, nullable)
- `isActive` (bool)

**`PatientPagedResponse`**
- `items` (`PatientListResponse[]`)
- `page` (int)
- `pageSize` (int)
- `totalCount` (int)
- `totalPages` (int)

**`PatientDetailResponse`**
- `patientId` (int)
- `patientNumber` (string)
- `firstName` (string)
- `lastName` (string)
- `preferredName` (string, nullable)
- `dateOfBirth` (string, ISO 8601 date)
- `gender` (`GenderResponse`)
- `mobileNumber` (string, nullable)
- `email` (string, nullable)
- `addressLine1` (string, nullable)
- `addressLine2` (string, nullable)
- `city` (string, nullable)
- `region` (string, nullable)
- `postalCode` (string, nullable)
- `country` (string, nullable)
- `nhiNumber` (string, nullable)
- `nzmcNumber` (string, nullable) — carried through from the approved database spec; see that document's Assumptions §10 regarding whether this field belongs on `Patient` at all.
- `notes` (string, nullable)
- `isActive` (bool)
- `createdDate` (string, ISO 8601 UTC)
- `createdBy` (string)
- `updatedDate` (string, ISO 8601 UTC, nullable)
- `updatedBy` (string, nullable)
- `rowVersion` (string, base64-encoded)

**`CreatePatientRequest`**
- `firstName` (string, required)
- `lastName` (string, required)
- `preferredName` (string, optional)
- `dateOfBirth` (string, required, ISO 8601 date)
- `genderCode` (string, required)
- `mobileNumber` (string, optional)
- `email` (string, optional)
- `addressLine1` (string, optional)
- `addressLine2` (string, optional)
- `city` (string, optional)
- `region` (string, optional)
- `postalCode` (string, optional)
- `country` (string, optional)
- `nhiNumber` (string, optional)
- `nzmcNumber` (string, optional)
- `notes` (string, optional)
- `isActive` (bool, optional — defaults `true`)

**`UpdatePatientRequest`** — identical field set to `CreatePatientRequest`, minus none-added, plus `rowVersion` (string, required); no `patientNumber` field, ever.

**`PatientFilterRequest`**
- `status` (string, nullable)
- `genderCode` (string, nullable)

**`PatientSearchRequest`** *(inherits `PatientFilterRequest`, same reconciliation pattern as `UserSearchRequest`/`UserFilterRequest`)*
- `searchTerm` (string, nullable)
- `page` (int, default `1`)
- `pageSize` (int, default `20`)
- `sortBy` (string, default `createdDate`)
- `sortDirection` (string, default `desc`)

No new error DTO — reuses Authentication's/User Management's `ProblemDetails`/`ValidationProblemDetails` shape (§8).

---

# 7. Validation Rules

| Field | Rule |
|---|---|
| `firstName`, `lastName` | Required, max length 100. |
| `dateOfBirth` | Required, cannot be in the future. (The "at least one day old" rule is **not enforced** — see §4.4 and the database spec's Assumptions.) |
| `genderCode` | Required, must match an existing, active `Gender.Code`. |
| `email` | Optional; if supplied, valid email format, max length 256. |
| `mobileNumber` | Optional; max length 20. No stricter format rule is defined — the business spec's country/locale scope is unresolved (per the database spec's Assumptions), so a strict phone-format regex isn't specified here either. |
| `nhiNumber` | Optional, max length 20, must be unique if supplied. NHI format validation ("New Zealand" per business spec §6) is **not specified in detail here** — pending the same locale-scope confirmation. |
| `nzmcNumber` | Optional, max length 20 — carried through as-is; see the open question about whether this field belongs on `Patient`. |
| `rowVersion` (Update only) | Required; a mismatch is a concurrency conflict (`409`), not a validation error (`400`). |
| `page` | ≥ 1. |
| `pageSize` | 1–100. |

**Duplicate Patient Number:** documented here because this task's requirements explicitly ask for it, but flagged as **not actually reachable from client input** — `PatientNumber` is server-generated (per the approved database spec) and never accepted from the client on Create or Update, so a client can't trigger this validation error. If it ever occurred, it would indicate a `SEQUENCE`/database malfunction, not a user error — that would surface as a generic `500`, not a `409`, and isn't something this API contract needs to document as a client-facing case.

**Duplicate NHI Number:** `409 Conflict` — this one *is* real, since `nhiNumber` is client-supplied and optional-but-unique.

**Invalid Date of Birth / Invalid Email / Invalid Mobile Number:** `400 Bad Request`.

**Patient Not Found:** `404 Not Found` on any endpoint taking `{patientId}`.

---

# 8. Error Responses

Reuses Authentication's/User Management's approved format exactly: RFC 7807 `ProblemDetails` for all errors, `ValidationProblemDetails` for `400`s. No new error shape.

**Example — duplicate NHI number (`409`):**
```json
{
  "type": "https://tools.ietf.org/html/rfc7231#section-6.5.8",
  "title": "A patient with this NHI number already exists.",
  "status": 409,
  "detail": "The NHI number 'ABC1234' is already assigned to another patient.",
  "instance": "/api/patients",
  "traceId": "00-...-00"
}
```

---

# 9. HTTP Status Codes

| Code | Used by |
|---|---|
| 200 OK | Both `GET`s, `search`, `PUT` (update/activate/deactivate) |
| 201 Created | `POST /api/patients` |
| 400 Bad Request | Validation failures; invalid gender code |
| 401 Unauthorized | Missing/invalid/expired JWT, any endpoint |
| 403 Forbidden | Valid JWT, role not permitted for that endpoint (e.g., Pharmacist calling Create) |
| 404 Not Found | Unknown `patientId` |
| 409 Conflict | Duplicate NHI number, concurrency conflict |

**`204 No Content` is not used**, for the same reason as User Management: every mutating endpoint returns the updated resource, both to minimize follow-up `GET` calls and for consistency with the project's established preference for explicit response bodies over bare `204`s.

---

# 10. Pagination

Implemented on both `GET /api/patients` and `POST /api/patients/search` via `page`/`pageSize`/`sortBy`/`sortDirection`, backed server-side by `usp_Patient_GetAll`/`usp_Patient_Search` per the approved database spec. No client-side pagination.

---

# 11. Versioning Strategy

No `/api/v1` prefix — consistent with every other module so far.

---

# 12. Security Considerations

- **PII exposure is broader here than in any prior module.** `PatientDetailResponse` carries full name, date of birth, home address, mobile, email, and a national health identifier. None of this should ever be logged in full — log `patientId`/`patientNumber` for correlation, matching the database spec's security section.
- Role-based restrictions are enforced per-endpoint (§3) — Pharmacists physically cannot reach Create/Update/Activate/Deactivate at the API layer, not just hidden in the UI.
- `NHINumber` uniqueness and required fields are enforced at the database level (constraints), not only in API-layer validation.

---

# 13. Performance Considerations

- Pagination is server-side; `pageSize` capped at 100.
- Search/filter/sort are backed by the indexes already defined in the database spec (`IX_Patient_LastName_FirstName`, `IX_Patient_MobileNumber`, `IX_Patient_Email`, `IX_Patient_IsActive`, `IX_Patient_GenderId`).
- Same leading-wildcard search caveat as User Management: `LIKE '%term%'` matching won't fully benefit from these indexes at scale — already flagged in the database spec, not re-solved here.

---

# 14. Swagger / OpenAPI Documentation Requirements

- `[ProducesResponseType]` per action for every status code it can return, mirroring `UsersController`'s pattern.
- All seven endpoints reuse the existing Bearer security scheme — no new Swagger configuration needed.
- Given the PII sensitivity noted in §12, action summaries should avoid including realistic-looking patient data in Swagger examples (matching the same discipline already applied to Authentication's credential examples).

---

# 15. Future Enhancements

- Medical History, Allergies, Emergency Contacts, Insurance, Attachments, Patient Portal, Appointment History, Prescription History, Clinical Notes — all explicitly deferred per the approved business spec §13; none of this contract needs to change shape to accommodate them later.
- If the system's country/locale scope is confirmed NZ-specific, NHI format validation could be tightened from "unique string" to a real checksum-validated format.

---

# 16. Assumptions Requiring Clarification

1. **Search combines Patient Number/First Name/Last Name/Mobile/Email/NHI into one `searchTerm`**, while Status/Gender are separate filters — mirroring User Management's `searchTerm` + `roleCode` + `status` split. The business spec's §4.2 vs §4.3 grouping supports this reading, but it's this document's interpretation, not stated explicitly as an API-level design choice upstream.
2. **"Duplicate Patient Number" is not a reachable client-facing validation case** (see §7) — flagging in case the intent was actually to allow client-supplied patient numbers, which would contradict the approved database spec's server-generation design.
3. **`nzmcNumber` is carried through unchanged from the database spec**, which itself flagged this as a likely error. Not re-litigated here; still open.
4. **Mobile/NHI format validation is deliberately loose** (length only, no regex), pending the still-unresolved country/locale scope question.
5. **The DOB "at least one day old" rule remains unenforced**, consistent with the database spec's own decision — still needs a business decision before implementation.
