# User Management — API Specification

**Feature:** User Management
**Status:** Draft — pending approval
**Version:** 1.0
**Based on:** User Management Business Specification v1.0 (approved), User Management Database Design Specification v1.0 (approved), Authentication API Specification v1.0 (approved — reused, not redesigned)

---

# 1. API Overview

This document defines the REST API contract for User Management: listing/searching/filtering users, viewing details, creating, editing, activating/deactivating, and resetting passwords. It is a design document only — no controllers, DTO classes, service/repository implementations, or SQL are included, per scope.

This module **reuses Authentication's existing JWT Bearer scheme and role-based authorization mechanism wholesale** — nothing about authentication itself is redesigned here. Every endpoint below requires a valid JWT (already issued by `POST /api/auth/login`); every mutating endpoint additionally requires the `SYSTEM_ADMINISTRATOR` role, using the exact same `Roles` constants class (`Prescription.Shared.Authorization.Roles`) and `[Authorize(Roles = ...)]` pattern already established.

Seven endpoints are in scope — one fewer than the nine operations named in the business/task requirements, because **Get all users / Search users / Filter users are consolidated into a single endpoint** rather than three separate ones (see §4.1 for why).

---

# 2. API Design Principles

- **Thin controllers**, delegating to an `IUserService` — no SQL, no business rules, no direct repository access from `UsersController`.
- **Reuse over reinvention.** Role data reuses the existing `RoleResponse` DTO (`Code`/`DisplayText`) from Authentication's `Prescription.Shared.DTOs` — no duplicate "user role" DTO is introduced. Authorization reuses the existing `Roles.SystemAdministrator` constant — no new role-string literals.
- **Constraint-first validation.** Per the approved database spec, duplicate Username/Email are caught via the database's own `UNIQUE` constraints (translated to `409 Conflict` at the Service layer), not a separate pre-check-then-insert pair — avoiding a check-then-act race condition.
- **Minimize round trips.** Activate/Deactivate/Reset-Password all return the updated resource in their response body, so the frontend doesn't need a follow-up `GET` to refresh its view (per `backend-architecture.md`'s "minimize database round trips" guideline).

```
UsersController              (thin — 7 actions)
        ↓
IUserService                  (business rules: uniqueness handling, self/last-admin
                               protection, password generation, FullName derivation)
        ↓
IUserRepository
        ↓ Dapper
usp_User_GetAll / usp_User_Search / usp_User_GetById / usp_User_Create /
usp_User_Update / usp_User_Activate / usp_User_Deactivate / usp_User_ResetPassword
        ↓
UserAccount, Role   (SQL Server)
```

---

# 3. Authentication & Authorization

Every endpoint in this module requires a valid, unexpired JWT (the same mechanism Authentication already established — no new scheme). **Every endpoint additionally requires the `SYSTEM_ADMINISTRATOR` role** — including the two read endpoints (`GET /api/users`, `GET /api/users/{id}`).

This is a deliberate resolution of an inconsistency the business-spec review flagged: business spec §4 states categorically "Only Administrators can access User Management," while §8 hedges with "All other roles have read or no access according to future requirements." This API spec follows §4's plain statement — **no role, including Doctor/Pharmacist/Receptionist, gets any access to this module in V1**, not even read-only. If that's not the intended outcome, this is the point to correct it before implementation.

| Endpoint | Authentication | Authorization |
|---|---|---|
| `GET /api/users` | Required | `SYSTEM_ADMINISTRATOR` only |
| `GET /api/users/{id}` | Required | `SYSTEM_ADMINISTRATOR` only |
| `POST /api/users` | Required | `SYSTEM_ADMINISTRATOR` only |
| `PUT /api/users/{id}` | Required | `SYSTEM_ADMINISTRATOR` only |
| `POST /api/users/{id}/activate` | Required | `SYSTEM_ADMINISTRATOR` only |
| `POST /api/users/{id}/deactivate` | Required | `SYSTEM_ADMINISTRATOR` only |
| `POST /api/users/{id}/reset-password` | Required | `SYSTEM_ADMINISTRATOR` only |

---

# 4. Endpoints

## 4.1 `GET /api/users`

- **Purpose:** List, search, and filter users in one paginated call.
- **Why one endpoint, not three:** "Get all," "Search," and "Filter" are the same underlying operation with different query-string inputs — a REST collection endpoint that accepts optional filters is idiomatic; three separate endpoints for overlapping behavior would be confusing and would duplicate pagination/sorting logic three times. The Service layer maps this to the database spec's two procedures: **no `searchTerm`/`role`/`status` supplied → `usp_User_GetAll`; any of them supplied → `usp_User_Search`.**
- **Query parameters:**

| Parameter | Type | Required | Notes |
|---|---|---|---|
| `page` | int | No, default `1` | Must be ≥ 1. |
| `pageSize` | int | No, default `20` | Must be between 1 and 100 (capped to bound query cost, per `backend-architecture.md`'s pagination guidance). |
| `searchTerm` | string | No | Matched against `Username`/`FirstName`/`LastName`/`Email`, per the database spec. Exact matching semantics (prefix vs. contains) are unresolved — see §16. |
| `role` | string | No | `Role.Code` filter (e.g. `DOCTOR`). |
| `status` | string | No | `"Active"` or `"Inactive"`. |
| `sortBy` | string | No, default `createdDate` | One of `fullName`, `username`, `email`, `role`, `status`, `lastLoginDate`, `createdDate`. |
| `sortDirection` | string | No, default `desc` | `"asc"` or `"desc"`. |

- **Response DTO:** `UserListResponse` (see §6).
- **Success:** `200 OK`.
- **Errors:** `400` (invalid `page`/`pageSize`/`sortBy`/`sortDirection`), `401`, `403`.

## 4.2 `GET /api/users/{userAccountId}`

- **Purpose:** View full details for one user (View User Details / populates the Edit User form).
- **Response DTO:** `UserDetailResponse`.
- **Success:** `200 OK`. **Errors:** `401`, `403`, `404` (no such user, or soft-deleted — though no delete feature exists in V1, see database spec §8).

## 4.3 `POST /api/users`

- **Purpose:** Create a new system user.
- **Request DTO:** `CreateUserRequest` (see §6).
- **Business rules:**
  1. `Username` and `Email` must both be unique (case-sensitivity unresolved — inherited open question from Authentication's own database spec, see §16).
  2. `RoleId` is resolved from `roleCode`; the role must exist and be active.
  3. `temporaryPassword` is hashed using Authentication's approved `PasswordHasher<TUser>` strategy — never stored or logged in plain text.
  4. `FullName` is derived as `FirstName + " " + LastName` (Application layer, not SQL — per database spec §3.1).
  5. `MustChangePassword` defaults to `true` on creation — an assumption, since the business spec only states this rule for Reset Password (§5.9), not Create; flagged in §16.
- **Success:** `201 Created`, `Location: /api/users/{userAccountId}`, body: `UserDetailResponse`.
- **Errors:** `400` (validation), `401`, `403`, `409` (duplicate `Username` or `Email` — distinguished by `ProblemDetails.detail`).

## 4.4 `PUT /api/users/{userAccountId}`

- **Purpose:** Edit an existing user's editable fields (business spec §5.5).
- **Request DTO:** `UpdateUserRequest` — `firstName`, `lastName`, `email`, `phoneNumber`, `roleCode`, `isActive`, `rowVersion`. **`username` is never accepted** — it's immutable after creation (business spec §5.5/§6) and isn't part of this DTO at all, not merely ignored if sent.
- **Business rules:**
  1. `FullName` is re-derived from `firstName`/`lastName` on every update.
  2. `rowVersion` must match the database's current value (optimistic concurrency, per database spec §3.1) — a mismatch means someone else edited this user first.
  3. If `isActive` is being set to `false` for the calling Administrator's own account, or for the last remaining active Administrator, the request is rejected (business rule flagged as missing from the approved business spec during its review — included here since the database/API layer needs to do *something* with this case; **needs your confirmation**, see §16).
- **Success:** `200 OK`, body: `UserDetailResponse` (with the new `rowVersion`).
- **Errors:** `400`, `401`, `403`, `404`, `409` (duplicate `Email` on change, concurrency conflict via stale `rowVersion`, or the self/last-Administrator rule above — distinguished by `ProblemDetails.detail`).

## 4.5 `POST /api/users/{userAccountId}/activate`

- **Purpose:** Set a user's status to Active (business spec §5.7).
- **Request DTO:** none.
- **Business rules:** Idempotent — activating an already-active user succeeds without error (not a `409`).
- **Success:** `200 OK`, body: `UserDetailResponse`.
- **Errors:** `401`, `403`, `404`.

## 4.6 `POST /api/users/{userAccountId}/deactivate`

- **Purpose:** Set a user's status to Inactive (business spec §5.8).
- **Request DTO:** none.
- **Business rules:**
  1. Idempotent for an already-inactive user.
  2. **Rejected if the target is the calling Administrator's own account** (business spec §5.8/§6: "An Administrator cannot deactivate their own account").
  3. **Rejected if the target is the last remaining active Administrator** — not part of the approved business spec text (flagged as missing during its review); included here as a recommendation needing your confirmation (§16).
- **Success:** `200 OK`, body: `UserDetailResponse`.
- **Errors:** `401`, `403`, `404`, `409` (self-deactivation or last-Administrator attempt).

## 4.7 `POST /api/users/{userAccountId}/reset-password`

- **Purpose:** Generate and set a new temporary password for a user (business spec §5.9).
- **Request DTO:** none.
- **Business rules:**
  1. A new temporary password is generated by the Application layer (not the caller), hashed via Authentication's approved strategy, and stored.
  2. `MustChangePassword` is set to `true`.
  3. **The plaintext temporary password is returned exactly once**, in this response only — it is never stored in plaintext, never logged, and cannot be retrieved again afterward. See §12 for why this is necessary given no email-sending infrastructure exists in this project.
- **Response DTO:** `ResetPasswordResponse` (see §6).
- **Success:** `200 OK`.
- **Errors:** `401`, `403`, `404`.

---

# 5. Request Parameters

Covered per-endpoint in §4. Summary of the pagination/search/filter/sort parameters (`GET /api/users` only): `page`, `pageSize`, `searchTerm`, `role`, `status`, `sortBy`, `sortDirection` — all optional, all query-string.

---

# 6. Response Models

**`UserListItemResponse`** *(one row in `GET /api/users`)*
- `userAccountId` (int)
- `username` (string)
- `fullName` (string)
- `email` (string)
- `phoneNumber` (string, nullable)
- `role` (`RoleResponse` — **reused from Authentication's DTOs**, not redefined)
- `isActive` (bool)
- `lastLoginDate` (string, ISO 8601 UTC, nullable)
- `createdDate` (string, ISO 8601 UTC)

**`UserListResponse`** *(the `GET /api/users` envelope — the one place this module's responses aren't a bare DTO, because a paginated collection inherently needs its own count/page metadata; this doesn't contradict Authentication's "no response envelope" decision, which was about not wrapping ordinary single-resource responses)*
- `items` (`UserListItemResponse[]`)
- `page` (int)
- `pageSize` (int)
- `totalCount` (int)
- `totalPages` (int)

**`UserDetailResponse`** *(`GET /api/users/{id}`, and the body returned by Create/Update/Activate/Deactivate)*
- `userAccountId` (int)
- `firstName` (string)
- `lastName` (string)
- `fullName` (string)
- `username` (string)
- `email` (string)
- `phoneNumber` (string, nullable)
- `role` (`RoleResponse`)
- `isActive` (bool)
- `lastLoginDate` (string, ISO 8601 UTC, nullable)
- `createdDate` (string, ISO 8601 UTC)
- `updatedDate` (string, ISO 8601 UTC, nullable)
- `rowVersion` (string, base64-encoded — required on the next `PUT` for concurrency checking)

**`CreateUserRequest`**
- `firstName` (string, required)
- `lastName` (string, required)
- `username` (string, required)
- `email` (string, required)
- `phoneNumber` (string, optional)
- `roleCode` (string, required — e.g. `"DOCTOR"`)
- `temporaryPassword` (string, required)
- `isActive` (bool, optional — defaults `true`)

**`UpdateUserRequest`**
- `firstName` (string, required)
- `lastName` (string, required)
- `email` (string, required)
- `phoneNumber` (string, optional)
- `roleCode` (string, required)
- `isActive` (bool, required)
- `rowVersion` (string, required)

**`ResetPasswordResponse`**
- `userAccountId` (int)
- `username` (string)
- `temporaryPassword` (string — shown once, see §4.7/§12)

No new error DTO — errors use Authentication's already-approved `ProblemDetails`/`ValidationProblemDetails` shape (§8).

---

# 7. Validation Rules

| Field | Rule |
|---|---|
| `firstName`, `lastName` | Required, max length 100 (matches database spec `NVARCHAR(100)`). |
| `username` (Create only) | Required, max length 100, must be unique. Never accepted on Update. |
| `email` | Required, valid email format, max length 256, must be unique (excluding the record being edited, on Update). |
| `phoneNumber` | Optional, max length 20. |
| `roleCode` | Required, must match an existing, active `Role.Code`. |
| `temporaryPassword` (Create only) | Required, minimum 8 characters — **an assumption**; no upstream spec defines a password composition policy beyond the hashing mechanism itself (flagged in §16). |
| `isActive` | Boolean; defaults `true` on Create. |
| `rowVersion` (Update only) | Required; a mismatch against the current database value is a concurrency conflict, not a validation error (`409`, not `400`). |
| `page` | ≥ 1. |
| `pageSize` | 1–100. |

**Duplicate Username / duplicate Email:** both surface as `409 Conflict`, not `400` — the input is well-formed, it just conflicts with existing data.
**Invalid role:** `400 Bad Request` — malformed/unrecognized client input, not a conflict.
**User not found:** `404 Not Found` on any endpoint taking `{userAccountId}`.
**Unauthorized:** `401` — missing/invalid/expired JWT.
**Forbidden:** `403` — valid JWT, but the caller's role isn't `SYSTEM_ADMINISTRATOR`.

---

# 8. Error Responses

Reuses Authentication's approved format exactly: RFC 7807 `ProblemDetails` for all errors, `ValidationProblemDetails` for `400`s produced by model validation. No new error shape is introduced.

**Example — duplicate email (`409`):**
```json
{
  "type": "https://tools.ietf.org/html/rfc7231#section-6.5.8",
  "title": "A user with this email already exists.",
  "status": 409,
  "detail": "The email address 'jane.doe@example.com' is already assigned to another user.",
  "instance": "/api/users",
  "traceId": "00-...-00"
}
```

**Example — concurrency conflict (`409`):**
```json
{
  "type": "https://tools.ietf.org/html/rfc7231#section-6.5.8",
  "title": "This user was modified by someone else.",
  "status": 409,
  "detail": "Reload the user and try again.",
  "instance": "/api/users/42",
  "traceId": "00-...-00"
}
```

---

# 9. HTTP Status Codes

| Code | Used by |
|---|---|
| 200 OK | `GET` (both), `PUT`, activate, deactivate, reset-password |
| 201 Created | `POST /api/users` |
| 400 Bad Request | Validation failures; invalid `page`/`pageSize`/`sortBy` |
| 401 Unauthorized | Missing/invalid/expired JWT, any endpoint |
| 403 Forbidden | Valid JWT, non-Administrator role, any endpoint |
| 404 Not Found | Unknown `userAccountId` |
| 409 Conflict | Duplicate Username/Email, concurrency conflict, self/last-Administrator deactivation |

**`204 No Content` is deliberately not used anywhere in this module** — every mutating endpoint returns the updated resource (or, for reset-password, the generated credential) in its body, both to minimize follow-up `GET` calls and for consistency with Authentication's own precedent of preferring an explicit body over a bare `204` (Authentication's Logout endpoint made the same choice).

---

# 10. Pagination

Implemented entirely on `GET /api/users` via `page`/`pageSize`/`sortBy`/`sortDirection`, backed server-side by `usp_User_GetAll`/`usp_User_Search` (both already designed to support this per the database spec). No client-side pagination.

---

# 11. Versioning Strategy

No `/api/v1` prefix — consistent with Authentication and Lookup Management's precedent (versioning remains a future, project-wide decision, not a per-module one).

---

# 12. Security Considerations

- `PasswordHash` is never selected by any read endpoint (`GetAll`/`Search`/`GetById` all exclude it, per the database spec).
- **The plaintext temporary password is deliberately exposed exactly once**, in the response body of `POST /api/users` (Create) and `POST /api/users/{id}/reset-password` — this is a necessary trade-off, not an oversight: no email-sending infrastructure exists anywhere in this project, so displaying it once to the authenticated Administrator (over HTTPS, immediately after generation) is the only way the credential can reach anyone. It must never be logged, cached, or persisted in plaintext anywhere after that single response.
- Every mutating endpoint requires the `SYSTEM_ADMINISTRATOR` role — reusing Authentication's existing JWT claim/role mechanism, no new authorization concept.
- `Email`/`PhoneNumber` must never be logged, consistent with the project's existing logging rules (extended here from passwords/JWTs to this module's own sensitive-ish fields, per the database spec's security section).
- Username/Email uniqueness and required fields are enforced at the database level (`UNIQUE`/`NOT NULL` constraints), not only in API-layer validation.

---

# 13. Performance Considerations

- `GET /api/users` pagination is server-side (`page`/`pageSize` passed to the stored procedure, not fetched-then-sliced in memory), per `backend-architecture.md`'s performance guidelines.
- `pageSize` is capped at 100 to bound query cost regardless of client input.
- Activate/Deactivate/Reset-Password return the updated resource directly, avoiding a second round trip the frontend would otherwise need to refresh its view.
- Search/filter/sort are backed by the indexes already defined in the database spec (`IX_UserAccount_IsActive`, `IX_UserAccount_LastName_FirstName`, `UQ_UserAccount_Email`).

---

# 14. Swagger / OpenAPI Documentation Requirements

- Register `[ProducesResponseType]` per action for every status code it can return (mirroring Authentication's `AuthController` pattern), with `UserDetailResponse`/`UserListResponse`/`ResetPasswordResponse`/`ProblemDetails`/`ValidationProblemDetails` as appropriate.
- All seven endpoints require the Bearer security scheme already registered for Authentication — no new Swagger security scheme needed.
- XML `<summary>` on each action; the Reset Password action's summary should explicitly warn that the response contains a one-time plaintext credential, so this isn't missed when read out of context.

---

# 15. Future Enhancements

- Bulk Import/Export, User Activity Logs, Password History, User Lockout — all explicitly deferred per the approved business spec §14; none of this contract needs to change shape to accommodate them later.
- If email-sending infrastructure is added later, `ResetPasswordResponse` could drop `temporaryPassword` from the API response entirely in favor of emailing it — an additive-safe change (removing a field is technically breaking, but this is the natural direction once that infrastructure exists).
- A dedicated `GET /api/users/{id}/activity` could surface a real audit trail if the "maintain audit history" objective is later expanded beyond last-modified metadata (per the business-spec review).

---

# 16. Assumptions Requiring Clarification

1. **All endpoints, including both `GET`s, are Administrator-only** (§3) — resolving business spec §4 vs. §8's inconsistency in favor of §4's categorical statement. Confirm this is the intended outcome.
2. **`MustChangePassword` defaults to `true` on both Create and Reset Password** — the business spec only states this rule for Reset Password (§5.9); extending it to Create is this document's own assumption.
3. **The "last Administrator" protection** on `PUT`/deactivate (§4.4, §4.6) is a recommendation carried over from the business-spec review, not part of the approved business spec text — needs explicit sign-off before implementation.
4. **Temporary password minimum length (8 characters)** is invented here — no upstream spec (Authentication's or this module's) defines a password composition policy.
5. **Username/Email case-sensitivity** for uniqueness checks is inherited, still unresolved, from Authentication's own database spec.
6. **Search matching semantics** (`searchTerm` — prefix vs. contains) remain unspecified by the approved business spec; documented as an open question in the database spec too.
7. **`MustChangePassword` enforcement** (actually forcing a password change at next login) has no mechanism in Authentication's approved login flow today — this API can set the flag, but nothing currently acts on it. Out of this module's scope to fix; flagged here so it isn't lost.
