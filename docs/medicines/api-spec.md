# Medicine Management — API Specification

**Feature:** Medicine Management
**Status:** Draft — pending approval
**Version:** 1.0
**Based on:** Medicine Management Business Specification v1.0 (approved), Medicine Management Database Design Specification v1.0 (approved)

---

# 1. API Overview

This document defines the REST API contract for Medicine Management: listing/searching/filtering the medicine catalog, viewing details, creating, editing, and activating/deactivating. Design document only — no controllers, DTO classes, service/repository implementations, or SQL, per scope.

Endpoint shape mirrors Patient Management's actual implemented pattern (`GET` for the plain list, `POST /search` for filtered search, `PUT` for update/activate/deactivate) for project-wide consistency. Seven endpoints are in scope, matching the task's GET/POST/PUT list exactly.

**This spec resolves one assumption both approved upstream documents left open: whether `MedicineCode` is server-generated (like `Patient.PatientNumber`) or client-supplied.** This task's own Validation section states *"Medicine Code is required"* — required-ness is a meaningful signal only for a value the client actually supplies; a server-generated value has nothing for the client to omit. This spec therefore treats `MedicineCode` as a **required, client-supplied, unique field on Create**, unlike `PatientNumber`. This is a genuine design decision made here, not a restatement of something already settled — flagged explicitly in Assumptions §16 in case the intent was actually server generation.

---

# 2. API Design Principles

- **Thin controllers**, delegating to an `IMedicineService` — no SQL, no business rules, no direct repository access.
- **Administrator-only writes.** Unlike Patient Management (which split Create/Update across Administrator/Doctor/Receptionist), every write endpoint here (`Create`, `Update`, `Activate`, `Deactivate`) is Administrator-only, per the approved business spec §8. Doctor/Pharmacist/Receptionist share one uniform "View only" tier.
- **`MedicineCode` is required on Create but never accepted on Update.** Once assigned it is immutable, matching the business spec's explicit "Medicine Code cannot be modified once assigned" rule (§5.5) — the same *structural* immutability pattern already used for `Patient.PatientNumber` and `UserAccount.Username` (no update parameter exists for it at all), even though the *value's origin* differs (client-supplied here, server-generated there).
- **`MedicineSummaryResponse` doubles as the list-row shape.** The task names only three response DTOs (`MedicineSummaryResponse`, `MedicineDetailResponse`, `MedicinePagedResponse`) — no separate "list" response, unlike Patient Management's `PatientListResponse`/`PatientSummaryResponse` split. This spec reads that literally: `MedicineSummaryResponse` carries every column the business spec's View Medicines screen needs (§5.1) *and* is what a future Prescription module would use for a medicine picker. A deliberate, narrower design than Patient's two-shape approach — flagged in Assumptions §16.
- **Reuse over reinvention.** Error format, pagination envelope shape, and versioning strategy all reuse Authentication's/User Management's/Patient Management's already-approved decisions — this is the "project's standard API response wrapper" being reused, not a new envelope design.

```
MedicinesController              (thin — 7 actions)
        ↓
IMedicineService                  (business rules: uniqueness handling, lookup validation)
        ↓
IMedicineRepository
        ↓ Dapper
usp_Medicine_GetAll / usp_Medicine_Search / usp_Medicine_GetById / usp_Medicine_Create /
usp_Medicine_Update / usp_Medicine_Activate / usp_Medicine_Deactivate
        ↓
Medicine, MedicineForm, MedicineRoute   (SQL Server)
```

---

# 3. Authentication & Authorization

Every endpoint requires a valid JWT (Authentication's existing scheme, unchanged). Authorization is simpler than Patient Management's — one write tier, one read tier:

| Endpoint | Authentication | Authorization |
|---|---|---|
| `GET /api/medicines` | Required | Any authenticated role (Administrator, Doctor, Pharmacist, Receptionist) — View |
| `GET /api/medicines/{id}` | Required | Any authenticated role — View |
| `POST /api/medicines/search` | Required | Any authenticated role — View |
| `POST /api/medicines` | Required | `SYSTEM_ADMINISTRATOR` only |
| `PUT /api/medicines/{id}` | Required | `SYSTEM_ADMINISTRATOR` only |
| `PUT /api/medicines/{id}/activate` | Required | `SYSTEM_ADMINISTRATOR` only |
| `PUT /api/medicines/{id}/deactivate` | Required | `SYSTEM_ADMINISTRATOR` only |

Doctor, Pharmacist, and Receptionist all resolve to the identical View-only access level, per the approved business spec §8 (a departure from Patient Management, where Doctor/Receptionist also had Create/Update).

---

# 4. Endpoints

## 4.1 `GET /api/medicines`

- **Purpose:** Paginated list of all medicines, no filters (business spec §5.1).
- **Query parameters:** `page` (default `1`), `pageSize` (default `20`, max `100`), `sortBy` (default `createdDate`; one of `medicineCode`, `medicineName`, `genericName`, `brandName`, `createdDate`, `updatedDate`), `sortDirection` (default `desc`).
- **Response:** `MedicinePagedResponse`.
- **Success:** `200 OK`. **Errors:** `400` (invalid `page`/`pageSize`/`sortBy`), `401`.

## 4.2 `GET /api/medicines/{medicineId}`

- **Purpose:** Full detail for one medicine (business spec §5.6).
- **Response:** `MedicineDetailResponse`.
- **Success:** `200 OK`. **Errors:** `401`, `404`.

## 4.3 `POST /api/medicines/search`

- **Purpose:** Search and filter medicines in one paginated call (business spec §5.2 + §5.3 combined, same merge rationale already established for Patient Management).
- **Request DTO:** `MedicineSearchRequest` — `searchTerm` (matched against `MedicineCode`/`MedicineName`/`GenericName`/`BrandName`/`Manufacturer`, per §5.2's exact field list), `dosageFormCode`, `routeCode`, `status` (`"Active"`/`"Inactive"`), `isControlledDrug` (nullable bool), plus `page`/`pageSize`/`sortBy`/`sortDirection`.
- **Response:** `MedicinePagedResponse`.
- **Success:** `200 OK`. **Errors:** `400`, `401`.

## 4.4 `POST /api/medicines`

- **Purpose:** Add a new medicine to the catalog (business spec §5.4).
- **Request DTO:** `CreateMedicineRequest`.
- **Business rules:**
  1. `medicineCode` is required and must be unique.
  2. `medicineName` + `strength` + `dosageFormCode` must not duplicate an existing medicine (business spec §6, database spec §5's `UQ_Medicine_Name_Strength_Form`).
  3. `dosageFormCode`/`routeCode` must resolve to existing, active `MedicineForm`/`MedicineRoute` values.
  4. `atcCode`, if supplied, must match the WHO ATC 7-character shape (database spec §5's `CHECK` constraint).
- **Success:** `201 Created`, `Location: /api/medicines/{medicineId}`, body: `MedicineDetailResponse`.
- **Errors:** `400` (validation, invalid dosage form/route, invalid ATC code shape), `401`, `403`, `409` (duplicate Medicine Code, duplicate Name+Strength+Form).

## 4.5 `PUT /api/medicines/{medicineId}`

- **Purpose:** Edit an existing medicine's editable fields (business spec §5.5).
- **Request DTO:** `UpdateMedicineRequest` — **no `medicineCode` field exists on this DTO at all**, matching `Patient`'s/`UserAccount`'s precedent for immutable identifiers (structurally absent, not merely ignored if sent).
- **Business rules:** same Name+Strength+Form/lookup/ATC-code rules as Create; `rowVersion` must match the current database value (optimistic concurrency, per the approved database spec's `RowVersion` recommendation).
- **Success:** `200 OK`, body: `MedicineDetailResponse` (with the new `rowVersion`).
- **Errors:** `400`, `401`, `403`, `404`, `409` (duplicate Name+Strength+Form on change, or stale `rowVersion`).

## 4.6 `PUT /api/medicines/{medicineId}/activate`

- **Purpose:** Set a medicine's status to Active.
- **Request DTO:** none. **Idempotent** — activating an already-active medicine succeeds without error.
- **Success:** `200 OK`, body: `MedicineDetailResponse`.
- **Errors:** `401`, `403`, `404`.

## 4.7 `PUT /api/medicines/{medicineId}/deactivate`

- **Purpose:** Deactivate a medicine so it can no longer be selected for new prescriptions (business spec §5.8), without deleting it.
- **Request DTO:** none. **Idempotent** for an already-inactive medicine.
- **Success:** `200 OK`, body: `MedicineDetailResponse`.
- **Errors:** `401`, `403`, `404`.

---

# 5. Request Models

**`CreateMedicineRequest`**
- `medicineCode` (string, required, max length 20)
- `medicineName` (string, required, max length 200)
- `genericName` (string, required, max length 200)
- `brandName` (string, optional, max length 200)
- `strength` (string, required, max length 50)
- `dosageFormCode` (string, required)
- `routeCode` (string, required)
- `manufacturer` (string, optional, max length 200)
- `atcCode` (string, optional, max length 20, WHO ATC shape if supplied)
- `isControlledDrug` (bool, optional, defaults `false`) — **not explicitly listed in the business spec's Create Medicine fields (§5.4), but included here** since the business spec's own Filters section (§5.3/task Filters) requires filtering by Controlled Drug, and Create is the only place this flag can first be set. Flagged in Assumptions §16.
- `notes` (string, optional)

**`UpdateMedicineRequest`** — identical field set to `CreateMedicineRequest` minus `medicineCode` (immutable, structurally absent), plus `rowVersion` (string, required, base64-encoded `byte[]`).

**`MedicineFilterRequest`**
- `dosageFormCode` (string, nullable)
- `routeCode` (string, nullable)
- `status` (string, nullable)
- `isControlledDrug` (bool, nullable)

**`MedicineSearchRequest`** *(inherits `MedicineFilterRequest`, same reconciliation pattern as `PatientSearchRequest`/`PatientFilterRequest`)*
- `searchTerm` (string, nullable)
- `page` (int, default `1`)
- `pageSize` (int, default `20`)
- `sortBy` (string, default `createdDate`)
- `sortDirection` (string, default `desc`)

**`ActivateMedicineRequest`** — intentionally empty, matching `ActivatePatientRequest`'s precedent (no body; `medicineId` from the route, `updatedBy` from the authenticated caller).

**`DeactivateMedicineRequest`** — intentionally empty, same reasoning.

No new error DTO — reuses the existing `ProblemDetails`/`ValidationProblemDetails` shape (§10).

---

# 6. Response Models

**`MedicineFormResponse`** / **`MedicineRouteResponse`**
- `code` (string)
- `displayText` (string)

*(Two new DTOs, structurally identical to `GenderResponse`/`RoleResponse`/`LookupValueResponse` — kept separate per this project's established one-shape-per-context precedent, not an oversight.)*

**`MedicineSummaryResponse`** *(doubles as the `MedicinePagedResponse` row shape and a future cross-module reference shape — see §2)*
- `medicineId` (int)
- `medicineCode` (string)
- `medicineName` (string)
- `genericName` (string)
- `brandName` (string, nullable)
- `strength` (string)
- `dosageForm` (`MedicineFormResponse`)
- `route` (`MedicineRouteResponse`)
- `manufacturer` (string, nullable)
- `isControlledDrug` (bool)
- `isActive` (bool)

**`MedicinePagedResponse`**
- `items` (`MedicineSummaryResponse[]`)
- `page` (int)
- `pageSize` (int)
- `totalCount` (int)
- `totalPages` (int)

**`MedicineDetailResponse`**
- `medicineId` (int)
- `medicineCode` (string)
- `medicineName` (string)
- `genericName` (string)
- `brandName` (string, nullable)
- `strength` (string)
- `dosageForm` (`MedicineFormResponse`)
- `route` (`MedicineRouteResponse`)
- `manufacturer` (string, nullable)
- `atcCode` (string, nullable)
- `isControlledDrug` (bool)
- `isActive` (bool)
- `notes` (string, nullable)
- `createdDate` (string, ISO 8601 UTC)
- `createdBy` (string)
- `updatedDate` (string, ISO 8601 UTC, nullable)
- `updatedBy` (string, nullable)
- `rowVersion` (string, base64-encoded)

---

# 7. Validation Rules

| Field | Rule |
|---|---|
| `medicineCode` | Required, max length 20, must be unique. |
| `medicineName` | Required, max length 200. |
| `genericName` | Required, max length 200, per the approved database spec's `NOT NULL` decision. |
| `strength` | Required, max length 50. |
| `dosageFormCode` | Required, must match an existing, active `MedicineForm.Code`. |
| `routeCode` | Required, must match an existing, active `MedicineRoute.Code`. |
| `atcCode` | Optional; if supplied, must match the WHO ATC 7-character shape (1 letter, 2 digits, 2 letters, 2 digits). |
| `medicineName` + `strength` + `dosageFormCode` | Must not duplicate an existing medicine (database spec's `UQ_Medicine_Name_Strength_Form`, excluding Manufacturer/Brand from the comparison per that spec's own flagged assumption). |
| `rowVersion` (Update only) | Required; a mismatch is a concurrency conflict (`409`), not a validation error (`400`). |
| `page` | ≥ 1. |
| `pageSize` | 1–100. |

**Duplicate Medicine Code:** `409 Conflict` — unlike `Patient.PatientNumber`, this **is** a real, reachable client-facing case here, since `medicineCode` is client-supplied (see §1).

**Duplicate Medicine Name + Strength + Dosage Form:** `409 Conflict`.

**Invalid Dosage Form / Invalid Route:** `400 Bad Request` — mirrors Patient Management's `InvalidGenderException` pattern exactly (an unrecognized or inactive lookup code is a validation failure, not a "not found").

**Invalid ATC Code format:** `400 Bad Request`.

**Medicine Not Found:** `404 Not Found` on any endpoint taking `{medicineId}`.

---

# 8. HTTP Status Codes

| Code | Used by |
|---|---|
| `200 OK` | Both `GET`s, `search`, `PUT` (update/activate/deactivate) |
| `201 Created` | `POST /api/medicines` |
| `400 Bad Request` | Validation failures; invalid dosage form/route/ATC code |
| `401 Unauthorized` | Missing/invalid/expired JWT, any endpoint |
| `403 Forbidden` | Valid JWT, role not permitted for that endpoint (any non-Administrator calling a write endpoint) |
| `404 Not Found` | Unknown `medicineId` |
| `409 Conflict` | Duplicate Medicine Code, duplicate Name+Strength+Form, concurrency conflict |
| `500 Internal Server Error` | Unhandled server-side failure — generic `ProblemDetails`, no exception detail, per the project's existing global exception-handling contract |

---

# 9. Pagination

Implemented on both `GET /api/medicines` and `POST /api/medicines/search` via `page`/`pageSize`/`sortBy`/`sortDirection`, backed server-side by `usp_Medicine_GetAll`/`usp_Medicine_Search` per the approved database spec. `pageSize` capped at 100. No client-side pagination.

---

# 10. Error Responses

Reuses the existing RFC 7807 `ProblemDetails`/`ValidationProblemDetails` format exactly — no new error shape.

**Example — duplicate Medicine Code (`409`):**
```json
{
  "type": "https://tools.ietf.org/html/rfc7231#section-6.5.8",
  "title": "A medicine with this code already exists.",
  "status": 409,
  "detail": "The medicine code 'PARA500T' is already in use.",
  "instance": "/api/medicines",
  "traceId": "00-...-00"
}
```

**Example — invalid dosage form (`400`):**
```json
{
  "type": "https://tools.ietf.org/html/rfc7231#section-6.5.1",
  "title": "Invalid dosage form.",
  "status": 400,
  "detail": "The specified dosage form does not exist or is not active.",
  "instance": "/api/medicines",
  "traceId": "00-...-00"
}
```

---

# 11. Versioning Strategy

No `/api/v1` prefix — consistent with every other module.

---

# 12. Security Considerations

- No PII is carried by this module (per the approved database spec §9) — standard logging discipline still applies (log `medicineId`/`medicineCode` for correlation, not full row payloads), but there is no PHI-level sensitivity to design around, unlike Patient Management.
- Write access is restricted to Administrators at the API layer, not only hidden in the UI — a Pharmacist or Doctor physically cannot reach `Create`/`Update`/`Activate`/`Deactivate` regardless of frontend behavior.
- `IsControlledDrug` is a plain data attribute at this layer only — this API does not implement any extra authorization or workflow around controlled substances; that belongs to the future Prescription/Dispensing modules (business spec §12.1/§12.2).

---

# 13. Performance Considerations

- Pagination is server-side; `pageSize` capped at 100.
- The approved business spec's NFR target ("performance optimized for thousands of medicines") is larger than any dataset this project has handled so far. The approved database spec already flags that `LIKE '%term%'` (contains) search on `MedicineCode`/`MedicineName`/`GenericName`/`BrandName`/`Manufacturer` won't benefit fully from the indexes defined for those columns at that scale — this API spec does not resolve that trade-off, only carries the flag forward to implementation time, consistent with how the same caveat was handled for Patient/User Management.
- Sort/filter columns are backed by the indexes already defined in the database spec (`IX_Medicine_GenericName`, `IX_Medicine_BrandName`, `IX_Medicine_IsActive`, `IX_Medicine_MedicineFormId`, `IX_Medicine_MedicineRouteId`).

---

# 14. Swagger / OpenAPI Documentation Requirements

- `[ProducesResponseType]` per action for every status code it can return, mirroring `PatientsController`'s pattern.
- XML doc `<summary>`/`<response>` comments on every action and every DTO property that isn't self-explanatory (e.g. `medicineCode`'s uniqueness, `atcCode`'s format).
- **Request/response examples**, e.g.:
  - `CreateMedicineRequest` example: `{ "medicineCode": "PARA500T", "medicineName": "Paracetamol", "genericName": "Paracetamol", "brandName": "Panadol", "strength": "500 mg", "dosageFormCode": "TABLET", "routeCode": "ORAL", "manufacturer": "Generic Health Ltd", "atcCode": "N02BE01", "isControlledDrug": false, "notes": null }`
  - `MedicineDetailResponse` example: the same fields plus `medicineId`, `isActive`, audit fields, and `rowVersion`.
- **Error response examples** for `400`/`404`/`409`, per §10.
- As already flagged for Patient Management: this project currently has **no Swagger/OpenAPI package or middleware registered at all** (checked at Patient Management's Controllers step) — `GenerateDocumentationFile` is enabled in the `.csproj`, so these XML comments will be ready to render, but nothing will actually surface in a Swagger UI until that gap is addressed project-wide. Not something this document can resolve on its own.

---

# 15. Future Enhancements

- Drug interaction checking, allergy cross-referencing, inventory/pricing, barcode/GTIN support, bulk import — all explicitly deferred per the approved business spec §15; none of this contract needs to change shape to accommodate them later.
- If `MedicineCode` generation is later confirmed to be server-side after all (see Assumptions §16), `CreateMedicineRequest.medicineCode` would need to be removed and the response's `medicineCode` would become purely server-derived — a breaking change to this contract, which is why that assumption should be resolved before implementation, not after.

---

# 16. Assumptions Requiring Clarification

1. **`MedicineCode` is treated as required and client-supplied**, resolving an assumption both the business spec and database spec left open. This is the single most consequential decision in this document — if the intent was actually server-generation (matching `PatientNumber`'s precedent), `CreateMedicineRequest` needs restructuring before implementation.
2. **`isControlledDrug` was added to `CreateMedicineRequest`/`UpdateMedicineRequest`** even though the business spec's Create Medicine field list (§5.4) doesn't mention it — included because the Filters requirement (§5.3) requires it to be filterable, and Create is the only place it could first be set. Confirm this is the intended reading.
3. **`MedicineSummaryResponse` was designed as a single shape serving both the paginated list and a future cross-module "picker" use** — a narrower design than Patient Management's separate List/Summary DTOs, chosen because the task names only three response DTOs total. If a future consumer needs a leaner shape than the full list-row, a fourth DTO would need to be introduced later.
4. **Search-matching semantics** (exact/prefix/contains) remain unspecified, the same recurring open question carried over from every prior module's spec.
5. **The Name+Strength+Form uniqueness check excludes Manufacturer/Brand**, per the database spec's own flagged assumption — carried forward unresolved here, not re-decided.
