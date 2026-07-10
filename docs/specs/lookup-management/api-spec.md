# Lookup Management — API Specification

**Feature:** Lookup Management
**Status:** Draft — pending approval
**Version:** 1.0
**Based on:** Business Specification and Database Design Specification (approved) — the database layer uses eight dedicated tables: `Gender`, `PrescriptionStatus`, `MedicineForm`, `MedicineRoute`, `DoseUnit`, `Frequency`, `DurationUnit`, `ProfileType`.

---

# 1. API Overview

This document defines the REST API contract for Lookup Management. It covers design only — no C# code, no controllers, no DTO classes.

The central design resolution: the database stores each category in its own dedicated table (an explicit architecture decision), while the business specification still describes the API as a single, generic concern (reusable lookup APIs; retrieval of all lookup data; retrieval by category). This spec keeps the API surface generic even though the storage underneath it is not — the "genericness" the business requirements ask for lives at the API boundary, not the schema.

---

# 2. API Design Principles

- **A unified contract over dedicated storage.** The API exposes exactly two operations (bulk retrieval and by-category retrieval), not one endpoint per dedicated table. An Application-layer mapping resolves a `categoryCode` (e.g. `Gender`, `PrescriptionStatus`) to the correct underlying repository internally, returning a uniform response shape regardless of which of the eight tables backed it.
- **Thin controllers.** A single `LookupsController` with two actions, delegating entirely to an Application-layer service — no SQL, no per-category branching logic, no direct repository access in the controller.
- **One service, eight repositories.** A single `ILookupService` depends on all eight repositories (one per dedicated table, per the database spec) but the controller and the public contract never see that multiplicity.
- **Category resolved by stable code, not surrogate ID or table name.** Matches the database spec's own decision to resolve categories by `Code`. This keeps the contract stable even if an underlying table is ever renamed.
- **DTOs never expose database structure.** Responses carry only `code`, `displayText`, `displayOrder` — never `<TableName>Id`, audit columns, or `IsActive`/`IsDeleted`. Inactive/deleted rows are filtered server-side and never reach the client.

```
LookupsController          (thin — 2 actions)
        ↓
ILookupService              (resolves categoryCode → correct repository)
        ↓
IGenderRepository, IPrescriptionStatusRepository, IMedicineFormRepository,
IMedicineRouteRepository, IDoseUnitRepository, IFrequencyRepository,
IDurationUnitRepository, IProfileTypeRepository
        ↓ Dapper — one stored procedure per table (e.g. usp_Gender_GetAll)
Gender, PrescriptionStatus, MedicineForm, MedicineRoute,
DoseUnit, Frequency, DurationUnit, ProfileType   (SQL Server)
```

**Maintenance caveat:** the `categoryCode → repository` mapping is the one piece of logic that must be updated every time a new lookup category/table is added at the database layer. If it isn't, `GET /api/lookups/{categoryCode}` will 404 for a category that genuinely exists in the database.

---

# 3. Authentication & Authorization

Both endpoints require a valid JWT Bearer token, per the application's overall security policy. No role restriction is applied — lookup data carries no PHI and is needed by every role (Administrator, Doctor, Pharmacist, Receptionist) to populate dropdowns, so access is limited to "authenticated," not to a specific role.

---

# 4. Endpoints

### `GET /api/lookups`
Retrieve every lookup category and its values in one call — intended for app-shell bootstrapping so the frontend fetches once and caches client-side rather than firing eight separate requests.

### `GET /api/lookups/{categoryCode}`
Retrieve values for a single category.

These two match the business specification's retrieval requirements exactly — no additional endpoints are introduced.

---

# 5. Request Parameters

| Endpoint | Parameter | Type | Required | Notes |
|---|---|---|---|---|
| `GET /api/lookups` | — | — | — | No parameters. |
| `GET /api/lookups/{categoryCode}` | `categoryCode` | string (path) | Yes | One of `Gender`, `PrescriptionStatus`, `MedicineForm`, `MedicineRoute`, `DoseUnit`, `Frequency`, `DurationUnit`, `ProfileType`. Case-insensitive match recommended to avoid client-side casing bugs. |

Neither endpoint accepts a request body or query parameters in V1.

---

# 6. Response Models

**`LookupCategoryResponse`**
- `code` (string)
- `name` (string)
- `values`: array of `LookupValueResponse`

**`LookupValueResponse`**
- `code` (string)
- `displayText` (string)
- `displayOrder` (int)

Only active, non-deleted values are ever included in either response.

---

# 7. Validation Rules

- `categoryCode` is validated against the known, fixed set of categories via the Application-layer resolution mapping — not a format/regex rule, since these are fixed values rather than free-form user input.
- Neither endpoint accepts a request body, so no body validation applies.

---

# 8. Error Responses

- Unrecognized `categoryCode` → `404 Not Found`. An empty `200 OK` would be ambiguous with "this category legitimately has zero values," so a distinct not-found response is used instead.
- Any unhandled failure → routed through the project's global exception-handling middleware, logged, and returned as a generic `500` response with no internal details exposed to the client.

---

# 9. HTTP Status Codes

| Code | Meaning |
|---|---|
| 200 OK | Successful retrieval, bulk or by category |
| 401 Unauthorized | Missing or invalid JWT |
| 404 Not Found | Unrecognized `categoryCode` |
| 500 Internal Server Error | Unhandled failure (global exception middleware; no internal details exposed) |

---

# 10. Pagination

Not applicable in V1. Total data volume across all eight tables is expected to be dozens of rows (per the seed values enumerated in the business and database specs), so both endpoints return complete result sets without pagination.

---

# 11. Versioning Strategy

No `/api/v1` prefix in V1. API versioning is listed as a future enhancement in the project overview, not a current requirement, and since this is the first API endpoint in the system, deciding a versioning scheme here would implicitly set the convention for every future module. That decision is deferred to a project-wide discussion rather than settled unilaterally in this module's spec.

---

# 12. Security Considerations

- No PHI or sensitive data is present in lookup responses.
- JWT authentication is still required on both endpoints for consistency with the project's overall security posture, even though the data itself is low-sensitivity.
- The only input surface (`categoryCode`) is validated against a known, fixed set rather than passed through to a query unchecked, removing any injection surface.

---

# 13. Performance Considerations

- Lookup data is small and rarely changing — an ideal caching case. Recommend server-side `IMemoryCache` (keyed per category, plus one key for the bulk result) and HTTP-level `Cache-Control`/ETag headers so repeat client requests can skip the round trip entirely.
- The bulk endpoint (`GET /api/lookups`) exists specifically to avoid the frontend needing eight separate round trips when a form needs several categories at once.

---

# 14. Future Enhancements

- When administrative CRUD is introduced, each dedicated table will likely need its own Create/Update/Delete actions — this does not require the read contract defined here to become a generic write contract; that can be designed separately when scoped.
- Adopt an `/api/v1` prefix if and when the project makes that decision globally.
- A category display `name` may need to be surfaced in the future for an admin UI — not required by any current read-only consumer.
