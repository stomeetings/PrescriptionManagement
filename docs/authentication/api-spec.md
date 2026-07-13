# Authentication — API Specification

**Feature:** Authentication & Authorization
**Status:** Draft — pending approval
**Version:** 1.0
**Based on:** Authentication Business Specification v1.1 (approved), Authentication Database Design Specification v1.0 (approved) — `Role` and `UserAccount` tables, `usp_UserAccount_GetByUsername`, `usp_UserAccount_GetById`.

---

# 1. API Overview

This document defines the REST API contract for Authentication & Authorization. It is a design document only — no controllers, DTO classes, service implementations, repository implementations, or SQL are included here.

This is the security foundation for every other module: all protected endpoints in the system depend on the JWT issued here. It is also the first API spec in the project to define a concrete JWT structure and a concrete error-response JSON shape — no prior module (including Lookup Management) had to make these decisions. The choices below are intended to become the project-wide precedent for future modules.

Three endpoints are in scope, matching the business specification's §12 API Requirements exactly: login, logout, and "me." No additional endpoints (e.g. registration, password reset) are introduced, consistent with the approved out-of-scope list.

---

# 2. API Design Principles

- **Thin controllers.** A single `AuthController` with three actions, delegating entirely to an `IAuthService` — no SQL, no password-hash comparison, no JWT-building logic in the controller.
- **Stateless by design.** No session store, no server-side token registry. `Logout` is a client-instruction endpoint only; it does not call any repository that mutates token state, because none exists.
- **Role never re-derived from the database on authorization.** Role travels inside the JWT as a claim; `[Authorize(Roles=...)]` (or equivalent policy) checks the claim only. The one exception is `GET /api/auth/me`, which does hit the database — not to authorize, but to return fresh profile data and to apply a live active/deleted check (see §4).
- **One stored procedure returns the password hash; nothing above the repository ever sees it again.** `usp_UserAccount_GetByUsername` is the only data-access call in this module that touches `PasswordHash`; it is consumed and discarded inside `IAuthService`, never mapped onto any response DTO.
- **DTOs never expose database structure.** No `RoleId`, no audit columns, no `IsActive`/`IsDeleted` in any response body.

```
AuthController              (thin — 3 actions: Login, Logout, Me)
        ↓
IAuthService                 (credential verification, JWT issuance, claims mapping)
        ↓
IUserAccountRepository
        ↓ Dapper
usp_UserAccount_GetByUsername (login only — only proc that returns PasswordHash)
usp_UserAccount_GetById        (me only — PasswordHash never selected)
        ↓
UserAccount, Role   (SQL Server)
```

---

# 3. Authentication & Authorization

## 3.1 General mechanism

Every protected endpoint in the system requires a valid, unexpired JWT Bearer token, validated by ASP.NET Core's JWT Bearer authentication middleware. An endpoint may additionally declare `[Authorize(Roles = "DOCTOR,PHARMACIST")]` (comma-separated `Role.Code` values, matching the JWT `role` claim exactly) to restrict access further. An endpoint with no `Roles` restriction is accessible to any authenticated user. This is the general mechanism; individual modules own their own role policy (per business spec §7) — this document only establishes the pattern.

For this module's own three endpoints specifically:

| Endpoint | Authentication Requirement | Authorization (Role) Requirement |
|---|---|---|
| `POST /api/auth/login` | None — `[AllowAnonymous]` (this endpoint *issues* the credential) | None |
| `POST /api/auth/logout` | Required — valid JWT | None (any authenticated user) |
| `GET /api/auth/me` | Required — valid JWT | None (any authenticated user) |

None of the three V1 endpoints declares a role restriction. `403 Forbidden` is therefore not produced by this module in V1; it is documented in §9 only because the mechanism supports it and future modules will use it.

## 3.2 JWT structure

**Algorithm: HS256 (HMAC-SHA256).** A single ASP.NET Core Web API both issues and validates every token in this system — no separate service or third party needs to validate a token without holding the secret. HS256's single shared signing key is simpler to operate and matches the business spec's wording of a single signing key (§9). RS256 would only be justified if a separate service needed to verify tokens without being trusted with the signing secret, which is not the case here.

**Claims embedded in the access token:**

| Claim | JWT short name | Value | Purpose |
|---|---|---|---|
| Subject | `sub` (`ClaimTypes.NameIdentifier`) | `UserAccountId` (as string) | Primary identity claim; `/api/auth/me` resolves the current user from this, never from a client-supplied ID. |
| Unique Name | `unique_name` (`ClaimTypes.Name`) | `Username` | Convenience/display claim. |
| Role | `role` (`ClaimTypes.Role`) | `Role.Code` (e.g. `DOCTOR`) | Drives `[Authorize(Roles=...)]` with zero DB round-trips per request. |
| JWT ID | `jti` | New GUID per issued token | No revocation exists in V1, but a unique ID costs nothing and preserves the option to correlate/audit specific tokens later without a breaking token-shape change. |
| Issued At | `iat` | Unix timestamp at issuance | Standard registered claim. |
| Not Before | `nbf` | Same as `iat` | Token is valid immediately on issuance. |
| Expiration | `exp` | `iat` + 60 minutes | Fixed per business spec §9 — only the 60-minute value itself is configuration-driven. |
| Issuer | `iss` | `PrescriptionManagement.Api` (placeholder — see §16) | Prevents token-confusion if the signing key is ever reused elsewhere. |
| Audience | `aud` | `PrescriptionManagement.Client` (placeholder — see §16) | Same purpose as issuer. |

`FullName` is deliberately **not** embedded as a claim: it can change (e.g. an admin corrects a typo) and the token would then serve stale data for up to 60 minutes. `/api/auth/me` exists specifically to provide fresh profile data on demand.

**Configuration keys** (`appsettings.json` / environment variables only, never hardcoded, per business spec §9):

```
Jwt:SigningKey          (secret, from config/env only)
Jwt:Issuer              (e.g. "PrescriptionManagement.Api")
Jwt:Audience            (e.g. "PrescriptionManagement.Client")
Jwt:ExpirationMinutes   (60 — explicitly configured, not a framework default)
```

---

# 4. Endpoints

### `POST /api/auth/login`

- **Purpose:** Authenticate a user by username/password and issue a JWT access token.
- **HTTP Method:** `POST`
- **Route:** `/api/auth/login`
- **Authentication Requirement:** None — `[AllowAnonymous]`.
- **Authorization Requirement:** None.
- **Request DTO — `LoginRequest`:**
  - `username` (string, required)
  - `password` (string, required)
- **Response DTO (success) — `LoginResponse`:**
  - `accessToken` (string)
  - `tokenType` (string, always `"Bearer"`)
  - `expiresIn` (int, seconds — always `3600`)
  - `expiresAtUtc` (string, ISO 8601 UTC)
  - `user` (`CurrentUserResponse` — see §6; reused as-is rather than duplicating an identical shape)
- **Validation Rules:**
  - `username`: required; whitespace-only treated as missing; max length 100 (matches `UserAccount.Username NVARCHAR(100)`).
  - `password`: required; whitespace-only treated as missing; max length 100 (this document's own proposed cap — see §16, item 6).
  - No complexity/minimum-length rule is enforced at login — password policy belongs to account provisioning (administrator-driven, out of scope here), not to the login check.
  - Enforced via DataAnnotations on `LoginRequest` + `[ApiController]`'s automatic model validation — no custom validation code required for the 400 case.
- **Success Response Example:**
  ```json
  HTTP/1.1 200 OK
  Content-Type: application/json

  {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI0MiIsInVuaXF1ZV9uYW1lIjoiamRvZSIsInJvbGUiOiJET0NUT1IiLCJqdGkiOiI3ZjNi...",
    "tokenType": "Bearer",
    "expiresIn": 3600,
    "expiresAtUtc": "2026-07-11T14:30:00Z",
    "user": {
      "userAccountId": 42,
      "username": "jdoe",
      "fullName": "Jane Doe",
      "role": {
        "code": "DOCTOR",
        "displayText": "Doctor"
      }
    }
  }
  ```
- **Error Responses:**
  - `400 Bad Request` — missing/whitespace/oversized `username` or `password` → `ValidationProblemDetails`.
  - `401 Unauthorized` — username not found, OR password incorrect, OR account inactive — all three collapse to one identical response body, per business spec §5/§8:
    ```json
    HTTP/1.1 401 Unauthorized
    Content-Type: application/problem+json

    {
      "type": "https://tools.ietf.org/html/rfc7235#section-3.1",
      "title": "Authentication failed.",
      "status": 401,
      "detail": "The username or password is incorrect, or the account is not active.",
      "instance": "/api/auth/login",
      "traceId": "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-00"
    }
    ```
  - `500 Internal Server Error` — unhandled failure, routed through the global exception middleware.
- **HTTP Status Codes:** `200`, `400`, `401`, `500`.
- **Business Rules:**
  1. Validate required fields.
  2. `usp_UserAccount_GetByUsername` lookup by `Username`.
  3. Verify submitted password against `PasswordHash` via `PasswordHasher<TUser>.VerifyHashedPassword`.
  4. Verify `IsActive = 1` (and `IsDeleted = 0`).
  5. If any of 2–4 fails → the single generic `401` above; the service layer must not branch response shape by which check failed.
  6. If all succeed → issue JWT with claims per §3.2, return `LoginResponse`.
  7. An inactive user must never receive a token, regardless of password correctness (business spec §8).
- **Notes:**
  - No rate limiting or lockout in V1 — accepted risk per business spec §9.
  - Recommended (defense-in-depth, not a hard requirement): the service should still perform a dummy `PasswordHasher` verification when the username is not found, so a "user not found" path and a "wrong password" path take comparable time and don't leak account existence via a timing side-channel.
  - Must be served over HTTPS only.

---

### `POST /api/auth/logout`

- **Purpose:** Provide a REST counterpart to `login` that the client calls to signal end-of-session; instructs the client to discard its JWT. The server performs no token invalidation because it holds no token state (business spec §6/§8).
- **HTTP Method:** `POST`
- **Route:** `/api/auth/logout`
- **Authentication Requirement:** Valid JWT required. Although the server does nothing stateful here, the endpoint is placed behind `[Authorize]` rather than `[AllowAnonymous]` (see §16, item 3), so that it behaves consistently with every other protected endpoint, provides a natural extension point for future audit logging of logout events, and returns `401` rather than a misleadingly successful no-op for an already-invalid token.
- **Authorization Requirement:** None (any authenticated user).
- **Request DTO:** None (empty body).
- **Response DTO (success) — `LogoutResponse`:**
  - `message` (string)
- **Validation Rules:** None (no request body).
- **Success Response Example:**
  ```json
  HTTP/1.1 200 OK
  Content-Type: application/json

  {
    "message": "Logout successful."
  }
  ```
  `200 OK` with a small confirmation body is used instead of `204 No Content` (see §16, item 4), so the frontend has an explicit, observable confirmation for what is otherwise a purely symbolic call.
- **Error Responses:**
  - `401 Unauthorized` — missing/invalid/expired JWT, produced by the standard JWT Bearer authentication challenge (no custom code needed):
    ```json
    HTTP/1.1 401 Unauthorized
    Content-Type: application/problem+json

    {
      "type": "https://tools.ietf.org/html/rfc7235#section-3.1",
      "title": "Unauthorized.",
      "status": 401,
      "detail": "A valid access token is required.",
      "instance": "/api/auth/logout",
      "traceId": "00-...-00"
    }
    ```
  - `500 Internal Server Error` — unhandled failure.
- **HTTP Status Codes:** `200`, `401`, `500`.
- **Business Rules:**
  - The server performs no revocation and maintains no session/blacklist (no such table exists per the database spec).
  - The token remains cryptographically valid until its natural `exp` even after this endpoint is called — this is an explicit, accepted trade-off, not a bug.
- **Notes:**
  - The frontend must delete the stored token client-side regardless of this call's outcome (even if it 401s, because the token was already invalid, the client-side deletion still must happen).
  - This is the natural extension point for a future "audit login/logout events" enhancement (business spec §16) without needing a new endpoint.

---

### `GET /api/auth/me`

- **Purpose:** Return the currently authenticated user's profile information, derived from the validated JWT.
- **HTTP Method:** `GET`
- **Route:** `/api/auth/me`
- **Authentication Requirement:** Valid JWT required.
- **Authorization Requirement:** None (any authenticated user).
- **Request DTO:** None. `UserAccountId` is resolved only from the validated JWT's `sub` claim — never from a path/query parameter — so there is no way for a caller to request another user's profile by supplying a different ID.
- **Response DTO (success) — `CurrentUserResponse`:**
  - `userAccountId` (int)
  - `username` (string)
  - `fullName` (string)
  - `role` (`RoleResponse`):
    - `code` (string)
    - `displayText` (string)

  **`ProfileType` is excluded from this response for V1** — confirmed decision (see §16, item 1): the business spec's wording ("Role and Profile Type") predates the database spec, which created `Role` and the pre-existing `ProfileType` lookup as separate, unrelated tables with no spec'd relationship between `UserAccount` and `ProfileType`.
- **Validation Rules:** None (no input surface).
- **Success Response Example:**
  ```json
  HTTP/1.1 200 OK
  Content-Type: application/json

  {
    "userAccountId": 42,
    "username": "jdoe",
    "fullName": "Jane Doe",
    "role": {
      "code": "DOCTOR",
      "displayText": "Doctor"
    }
  }
  ```
- **Error Responses:**
  - `401 Unauthorized` — missing/invalid/expired JWT, **or** the JWT is structurally valid and unexpired but `usp_UserAccount_GetById` returns no row, or the row has `IsDeleted = 1` or `IsActive = 0` (see Business Rules below). Both cases return the identical generic shape:
    ```json
    HTTP/1.1 401 Unauthorized
    Content-Type: application/problem+json

    {
      "type": "https://tools.ietf.org/html/rfc7235#section-3.1",
      "title": "Unauthorized.",
      "status": 401,
      "detail": "A valid access token is required.",
      "instance": "/api/auth/me",
      "traceId": "00-...-00"
    }
    ```
  - `500 Internal Server Error` — unhandled failure.
- **HTTP Status Codes:** `200`, `401`, `500`.
- **Business Rules:**
  - Resolve `UserAccountId` from the JWT `sub` claim.
  - Call `usp_UserAccount_GetById` (which never selects `PasswordHash` at all).
  - Re-check `IsActive`/`IsDeleted` live on every call, even though the JWT itself may still be unexpired. If the account has since been deactivated or soft-deleted, treat the call as `401` rather than returning stale profile data for a user who should no longer have access. This is a deliberate, partial mitigation for the documented trade-off that an issued JWT cannot otherwise be revoked before natural expiry — it only closes the gap for this one endpoint, not for every other protected endpoint in the system (see §16, item 5).
  - `PasswordHash` must never appear in this response, at any layer.
- **Notes:**
  - This endpoint's DTO maps close to 1:1 from `usp_UserAccount_GetById`'s result set, plus the `Role` join already present per the database spec.

---

# 5. Request Parameters

| Endpoint | Parameter | Type | Required | Notes |
|---|---|---|---|---|
| `POST /api/auth/login` | `username` | string (body) | Yes | Max length 100; whitespace-only treated as missing. |
| `POST /api/auth/login` | `password` | string (body) | Yes | Max length 100 (this document's own proposed cap); whitespace-only treated as missing. |
| `POST /api/auth/logout` | — | — | — | No body. Requires `Authorization: Bearer <token>` header. |
| `GET /api/auth/me` | — | — | — | No body, no query/path params. Requires `Authorization: Bearer <token>` header; identity resolved from the token's `sub` claim only. |

---

# 6. Response Models

**`LoginResponse`**
- `accessToken` (string)
- `tokenType` (string — always `"Bearer"`)
- `expiresIn` (int — seconds, always `3600`)
- `expiresAtUtc` (string — ISO 8601 UTC)
- `user` (`CurrentUserResponse`)

**`CurrentUserResponse`** (shared by `LoginResponse.user` and the bare `GET /api/auth/me` body — one shape, one source of truth)
- `userAccountId` (int)
- `username` (string)
- `fullName` (string)
- `role` (`RoleResponse`)

**`RoleResponse`**
- `code` (string — e.g. `DOCTOR`)
- `displayText` (string — e.g. `"Doctor"`)

Mirrors the Lookup module's `LookupValueResponse` shape (`code`/`displayText`) deliberately, for consistency across the project rather than returning a bare role string.

**`LogoutResponse`**
- `message` (string)

**Error shape — `ProblemDetails` / `ValidationProblemDetails`** — see §8.

All JSON field names are camelCase. No surrogate ID other than `userAccountId` is ever exposed (no `RoleId`, no audit columns, no `IsActive`/`IsDeleted`).

---

# 7. Validation Rules

- `LoginRequest.username`: required, non-whitespace, max length 100.
- `LoginRequest.password`: required, non-whitespace, max length 100 (see §16, item 6).
- `Logout` and `Me` accept no body — no body validation applies; their only "validation" is JWT presence/validity, handled by authentication middleware, not by model validation.
- Enforced via DataAnnotations + `[ApiController]`'s automatic `400` model-validation response — no bespoke validation-error code is required.

---

# 8. Error Responses

## 8.1 Response format: RFC 7807 `ProblemDetails`

**Confirmed decision:** `application/problem+json` (RFC 7807 `ProblemDetails`, with ASP.NET Core's built-in `ValidationProblemDetails` for the `400` case), not a custom envelope.

**Justification:**
- ASP.NET Core 8 has first-class, built-in support for it (`AddProblemDetails()`, `ProblemDetailsFactory`, `ControllerBase.Problem()`/`ValidationProblem()`), so adopting it costs nothing extra and stays within the framework rather than inventing bespoke JSON.
- It is an IETF standard, self-describing (`type` is a URI), and extensible (`errors`, `traceId`) without needing a project-specific envelope spec.
- It slots directly into the global exception-handling middleware described in `backend-architecture.md` — the middleware's job becomes "catch, log, and return a generic `ProblemDetails` with a `traceId`," not "invent a response shape."
- Since no other module in the repo has committed to an error shape yet, this becomes the first error contract in the project and is intended as project-wide precedent for future module API specs.

**Base shape (all errors):**
```json
{
  "type": "string — URI reference identifying the error category",
  "title": "string — short, human-readable summary",
  "status": 401,
  "detail": "string — specific, safe-to-expose explanation (never internal exception detail)",
  "instance": "string — the request path that produced the error",
  "traceId": "string — correlation ID for support/log lookup, never used to expose internal state to the client"
}
```

**`400` validation errors** use the built-in `ValidationProblemDetails` extension, adding an `errors` dictionary automatically produced by `[ApiController]` model validation — no custom code:
```json
{
  "type": "https://tools.ietf.org/html/rfc7231#section-6.5.1",
  "title": "One or more validation errors occurred.",
  "status": 400,
  "errors": {
    "Username": ["The Username field is required."],
    "Password": ["The Password field is required."]
  },
  "traceId": "00-...-00"
}
```

## 8.2 Per-case summary

- **Login — invalid input:** `400` (`ValidationProblemDetails`).
- **Login — user not found / wrong password / inactive account:** ONE generic `401` (business spec §5/§8) — must not distinguish cases in title/detail/shape.
- **Logout / Me — missing, malformed, or expired JWT:** `401`, produced by the framework's JWT Bearer challenge — no custom body needed beyond the standard `ProblemDetails` shape.
- **Me — JWT valid but account deactivated/deleted since issuance:** `401`, identical shape to the above.
- **Any endpoint — unhandled exception:** `500`, generic title/detail (no stack trace, no exception message), always includes `traceId`, routed through the existing global exception middleware.

---

# 9. HTTP Status Codes

| Code | Meaning | Used by |
|---|---|---|
| 200 OK | Successful login, logout, or profile retrieval | Login, Logout, Me |
| 400 Bad Request | Missing/invalid request fields | Login |
| 401 Unauthorized | Auth failure (login), or missing/invalid/expired JWT (logout, me), or JWT valid but account no longer active/exists (me) | Login, Logout, Me |
| 500 Internal Server Error | Unhandled failure (global exception middleware; no internal details exposed) | Login, Logout, Me |

`403 Forbidden` is part of the general authorization mechanism (§3.1) but is not produced by any of this module's three endpoints in V1, since none declares a role restriction. It is documented here only so future modules referencing this spec as precedent know it's reserved and how it fits alongside `401`.

---

# 10. Pagination

Not applicable. None of the three endpoints returns a collection.

---

# 11. Versioning Strategy

No `/api/v1` prefix in V1 — consistent with the Lookup Management precedent (versioning is a future, project-wide enhancement, not a per-module decision), and matches the routes already fixed in scope: `/api/auth/login`, `/api/auth/logout`, `/api/auth/me`.

---

# 12. Security Considerations

- All three endpoints served over HTTPS only (business spec §9).
- Signing key (`Jwt:SigningKey`) sourced from configuration/environment only, never hardcoded.
- `PasswordHash` is selected by exactly one stored procedure (`usp_UserAccount_GetByUsername`) and never leaves the service layer; never logged, never serialized onto any DTO.
- Full JWTs and passwords are never written to logs — auth failures may be logged, but only in a form that identifies the attempt, not the credential.
- The single generic `401` for login failure is a hard requirement, not a UX nicety — it is the mechanism that satisfies "do not reveal whether an account exists" (business spec §5/§8).
- Known, accepted limitation: an administrator deactivating a user does not invalidate that user's already-issued JWT before natural expiry, except for `/api/auth/me`'s live re-check (§4), which is a partial mitigation only — every other protected endpoint in the system still trusts the token's claims for up to 60 minutes after deactivation. Future modules' own API specs should call this out again, not assume it's solved here.
- No brute-force protection (no lockout, no rate limiting) — explicitly accepted risk (business spec §9/§14).

---

# 13. Performance Considerations

- `Login` is the module's hot path: a single indexed lookup (`usp_UserAccount_GetByUsername`, unique index on `Username`) plus in-process password verification and JWT signing — no additional round trips.
- `Logout` performs no database work at all — it is a pure, stateless, in-process operation (verify JWT, return confirmation).
- `Me` performs exactly one database round trip (`usp_UserAccount_GetById`) — the same round trip is reused both to build the response and to perform the live active/deleted check (§4), so the extra security check adds no additional query.
- Authorization on every other protected endpoint in the system (outside this module) requires zero database round trips, since role travels in the JWT — this directly satisfies the "no DB lookup per request beyond embedded claims" non-functional requirement (business spec §10).

---

# 14. Swagger / OpenAPI Documentation Requirements

Documentation requirements only — no code shown, per this document's scope.

- **Security scheme registration:** register a Bearer/JWT security scheme in Swagger (`type: http`, `scheme: bearer`, `bearerFormat: JWT`) so Swagger UI shows an "Authorize" padlock, and testers can paste a token once and have it applied to every subsequent request in the UI.
- **Selective application:** apply the security requirement globally to protected operations, but `POST /api/auth/login` must be explicitly excluded (via an operation filter keyed off `[AllowAnonymous]`, or an equivalent Swagger-level exclusion) so Swagger UI does not misleadingly show a padlock/require a token on the one endpoint whose entire purpose is to obtain a token.
- **Per-action response typing:** every action must declare `[ProducesResponseType]` for each status code it can actually return, with its concrete response type:
  - `Login`: `200` → `LoginResponse`, `400` → `ValidationProblemDetails`, `401` → `ProblemDetails`, `500` → `ProblemDetails`.
  - `Logout`: `200` → `LogoutResponse`, `401` → `ProblemDetails`, `500` → `ProblemDetails`.
  - `Me`: `200` → `CurrentUserResponse`, `401` → `ProblemDetails`, `500` → `ProblemDetails`.
- **XML doc comments:** enable `GenerateDocumentationFile` + Swagger's `IncludeXmlComments`, and require a `<summary>` on each action describing intent (e.g. Me's summary should explicitly state it derives identity from the bearer token, not from any parameter).
- **UI guidance text:** the Swagger description for `Login` should note it must be called without a token set; the descriptions for `Logout`/`Me` should note the "Authorize" token must be set first.
- **No real credentials in examples:** any example values in Swagger annotations must use clearly fake placeholder credentials, never a real or realistic-looking production account.

---

# 15. Future Enhancements

- Refresh Tokens, MFA, Account Lockout, Password Reset, Email Verification, SSO — all explicitly out of scope per business spec §16, and none of this contract needs to change shape to accommodate them later (e.g. `LoginResponse` could gain a `refreshToken` field additively).
- Audit logging of login/logout events (business spec §16) — `Logout` being an authenticated, explicit endpoint (§4) already gives this a natural hook.
- Session/device management (viewing/revoking active sessions) would require a Session/Token table explicitly deferred in the database spec.
- `usp_Role_GetAll`-backed role listing, once an admin/user-management UI is scoped — not needed by this module's own three endpoints.
- Adopt an `/api/v1` prefix if and when the project makes that decision globally (§11).

---

# 16. Assumptions Requiring Clarification

The following were resolved during design review and are reflected as confirmed decisions above:

- **"Me" endpoint omits `ProfileType`** (§4) — confirmed: `CurrentUserResponse` returns `userAccountId`, `username`, `fullName`, `role` only. `ProfileType` is genuinely out of scope for V1 auth since no spec'd relationship between `UserAccount` and `ProfileType` exists.
- **Error format = RFC 7807 `ProblemDetails`** (§8) — confirmed as the project-wide error contract.
- **JWT algorithm = HS256** (§3.2) — confirmed.

The following remain open and should be confirmed before implementation begins:

1. ~~ProfileType vs. Role~~ — resolved above.
2. **Issuer/audience exact string values.** `PrescriptionManagement.Api` / `PrescriptionManagement.Client` are placeholders proposed in §3.2 — need confirmation of the exact values, since they become permanent identifiers embedded in every issued token.
3. **Logout requires authentication.** The business spec doesn't explicitly say whether the logout endpoint itself must sit behind `[Authorize]`; this document chose to require a valid JWT (§4) for consistency and future audit-logging support, rather than making it `[AllowAnonymous]` on the grounds that "the server does nothing anyway."
4. **Logout returns `200` + a message body, not `204 No Content`.** A stylistic choice (§4) favoring an explicit confirmation body for what is otherwise an invisible, no-op action server-side.
5. **`Me` performs a live `IsActive`/`IsDeleted` re-check on every call**, rejecting with `401` even for an unexpired token if the account has since been deactivated/deleted. This goes beyond the literal business spec wording (which only checks `IsActive` at login) and is proposed as a partial mitigation for the database spec's flagged "cannot revoke before expiry" trade-off — needs confirmation this behavior is desired for V1, since it's an extra business rule this document introduces.
6. **Password input max length (100 characters).** The business spec defers "exact limits" to the database spec, but the database spec only fixes the length of the stored hash column, not the plaintext password input's maximum length at login. The `100`-character cap proposed here (§4/§7) is this document's own invented value.
7. **No response envelope (bare DTOs).** This document deliberately returns bare resource JSON on success (matching the Lookup precedent) rather than wrapping every response in a `{ success, data }`-style envelope, since HTTP status codes already carry success/failure semantics. Flagged for confirmation as a first-time, precedent-setting decision alongside the error-format one.
8. **Username case-sensitivity.** Inherited, unresolved from the database spec's own open question — affects how the `username` field should be echoed back (exact stored casing vs. submitted casing).
9. **`role` returned as `{ code, displayText }` object vs. a bare string.** Mirrors the Lookup module's `LookupValueResponse` shape for consistency (§6) — a low-risk but genuine stylistic choice worth surfacing, since a bare `"role": "DOCTOR"` string would also have satisfied the business spec's wording.
