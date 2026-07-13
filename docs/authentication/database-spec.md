# Authentication — Database Design Specification

**Feature:** Authentication & Authorization
**Status:** Draft — pending approval
**Version:** 1.0
**Based on:** `docs/authentication/authentication.md` (Business Specification v1.1, approved)

---

# 1. Database Overview

This document defines the SQL Server schema required to support JWT-based authentication and role-based authorization, per the approved Authentication business specification. It covers structure only — no T-SQL scripts, no stored procedure bodies, no C# code.

Scope is Version 1 only: username/password login, a single role per user, active/inactive account status, and no server-side token state (no Refresh Tokens, no session table — see §2).

---

# 2. Database Design Principles

**Table named `UserAccount`, not `User`.** `USER` is a reserved keyword/system function in T-SQL. Naming the table `UserAccount` avoids requiring bracket-quoting (`[User]`) everywhere it's referenced, consistent with "use SQL Server best practices."

**A dedicated `Role` table, following the same lookup-table template already established for Lookup Management** (`Code`, `DisplayText`, `DisplayOrder`, `IsActive`, audit columns) — not a generic/shared table, consistent with the per-category dedicated-table pattern already in place. **Important caveat, flagged for your attention below (§20):** the existing `ProfileType` lookup table (`Doctor`, `Nurse`, `Pharmacist`, `Administrator`) overlaps conceptually with these Authentication actors (`System Administrator`, `Doctor`, `Pharmacist`, `Receptionist`) but is not identical — this spec creates a separate `Role` table rather than reusing `ProfileType` as-is, because reusing it would be factually wrong (missing `Receptionist`, includes `Nurse` which isn't an Authentication actor). This needs a business decision, not a silent assumption.

**No Session, Token, or RefreshToken table.** The approved business spec (§6, §8) states the server maintains no token state and Refresh Tokens are out of scope. JWTs are self-contained and stateless, so there is nothing server-side to persist per login — adding such a table now would contradict the approved design.

**Single `RoleId` per user, not a many-to-many `UserRole` table.** The business spec's Actors (§4) present four distinct, seemingly mutually exclusive roles, and nothing in the approved spec asks for a user to hold multiple roles simultaneously. A simple one-to-many (`UserAccount` → `Role`) relationship is the simplest design that satisfies what's actually specified; multi-role support is noted as a future enhancement (§19), not built in now.

**Password hash stored as a single `NVARCHAR` column, no separate `Salt` column.** Per the approved spec (§9), passwords are hashed with ASP.NET Core's `PasswordHasher<TUser>`, whose output format embeds the salt within the hash string itself — a separate salt column would be redundant.

**Standard audit columns and soft delete**, consistent with every other table in this project (`CreatedDate`, `CreatedBy`, `UpdatedDate`, `UpdatedBy`, `IsDeleted`) — no new convention introduced here.

---

# 3. Entity Relationship Overview

```
Role (1) ──< (many) UserAccount
```

One `Role` has many `UserAccount` rows; each `UserAccount` belongs to exactly one `Role` (enforced by a `NOT NULL` foreign key). No other relationships exist within the Authentication module itself.

**Downstream dependency (out of scope for this document):** future modules will foreign-key into `UserAccount.UserAccountId` — e.g., `Prescription.CreatedByUserAccountId`, `AuditLog.UserAccountId` — since almost every future audit/ownership field in the system will need to reference "which user did this."

---

# 4. Tables

| Table | Purpose |
|---|---|
| `Role` | The fixed set of authorization roles (`System Administrator`, `Doctor`, `Pharmacist`, `Receptionist`), following the same dedicated lookup-table pattern as Lookup Management. |
| `UserAccount` | One row per system user; holds login credentials (hashed), profile information, role assignment, and active/inactive status. |

---

# 5. Columns

### `Role`

| Column | Type | Nullable | Description |
|---|---|---|---|
| `RoleId` | `INT IDENTITY` | No | Surrogate primary key. |
| `Code` | `NVARCHAR(50)` | No | Stable business key (e.g. `SYSTEM_ADMINISTRATOR`, `DOCTOR`, `PHARMACIST`, `RECEPTIONIST`), embedded in the JWT role claim. |
| `DisplayText` | `NVARCHAR(150)` | No | Human-readable label (e.g. "System Administrator"). |
| `DisplayOrder` | `INT` | No | Display ordering for any future role-management UI. |
| `IsActive` | `BIT` | No | Whether the role is currently assignable. Default `1`. |
| `CreatedDate` | `DATETIME2` | No | Audit column (UTC). |
| `CreatedBy` | `NVARCHAR(100)` | No | Audit column. |
| `UpdatedDate` | `DATETIME2` | Yes | Audit column. |
| `UpdatedBy` | `NVARCHAR(100)` | Yes | Audit column. |
| `IsDeleted` | `BIT` | No | Soft-delete flag. Default `0`. |

### `UserAccount`

| Column | Type | Nullable | Description |
|---|---|---|---|
| `UserAccountId` | `INT IDENTITY` | No | Surrogate primary key. |
| `Username` | `NVARCHAR(100)` | No | Login identifier. Unique (§8). |
| `PasswordHash` | `NVARCHAR(256)` | No | Output of `PasswordHasher<TUser>` (salt embedded). Length is a conservative upper bound — verify against the actual hasher output length during implementation. |
| `FullName` | `NVARCHAR(200)` | No | Required by "Retrieve Logged-in User Information" (business spec §6). |
| `RoleId` | `INT` | No | Foreign key to `Role.RoleId`. |
| `IsActive` | `BIT` | No | Drives the "Active/Inactive User Validation" business rule. Default `1`. |
| `CreatedDate` | `DATETIME2` | No | Audit column (UTC). |
| `CreatedBy` | `NVARCHAR(100)` | No | Audit column — per business spec §8, this will typically be another administrator's username, since self-registration is out of scope. |
| `UpdatedDate` | `DATETIME2` | Yes | Audit column. |
| `UpdatedBy` | `NVARCHAR(100)` | Yes | Audit column. |
| `IsDeleted` | `BIT` | No | Soft-delete flag. Default `0`. A deactivated account should normally be `IsActive = 0`, not deleted — deletion is reserved for genuine data cleanup, not routine deactivation. |

---

# 6. Primary Keys

* `Role.RoleId`
* `UserAccount.UserAccountId`

Both are surrogate `INT IDENTITY` keys, consistent with every other table in this project — insulates foreign keys from any future correction to `Username` or `Code`.

---

# 7. Foreign Keys

* `UserAccount.RoleId` → `Role.RoleId` — `NOT NULL`, restrictive delete (no cascade). A `Role` referenced by any `UserAccount` cannot be hard-deleted, consistent with the project's soft-delete-only convention.

No other foreign keys exist within this module.

---

# 8. Unique Constraints

* `UNIQUE(UserAccount.Username)` — required for login lookups to be unambiguous, and to support the "user exists" check in the authentication flow.
* `UNIQUE(Role.Code)` — consistent with every other lookup table in the project.

**Assumption flagged for clarification (§20):** whether `Username` uniqueness should be case-insensitive (e.g., `jdoe` and `JDoe` treated as the same account) depends on the column's collation. This should be an explicit decision, not left to whatever the default server collation happens to be.

---

# 9. Indexing Strategy

* The unique constraint on `UserAccount.Username` (§8) is implemented as a unique non-clustered index and directly serves the single most performance-sensitive query in this module: looking up a user by username at login.
* A non-clustered index on `UserAccount.RoleId` is recommended, consistent with standard practice of indexing foreign key columns to support join performance — even though user counts are expected to be small, this is a cheap, standard index to include from the start.
* No further indexes are recommended. `Role` is expected to hold only a handful of rows; a clustered index scan is trivial at that scale.

---

# 10. Audit Columns

Both tables carry the standard set: `CreatedDate`, `CreatedBy`, `UpdatedDate`, `UpdatedBy`, `IsDeleted`, plus `IsActive` for business-level status — identical convention to every other table in this project. No `RowVersion` is included in Version 1, consistent with the same reasoning applied elsewhere: no concurrent-write scenario is defined yet for this module.

---

# 11. Password Storage Strategy

* Passwords are never stored in plain text, anywhere, under any circumstance (business spec §9).
* `UserAccount.PasswordHash` stores the full output of ASP.NET Core's `PasswordHasher<TUser>`, which internally embeds algorithm version, salt, and iteration count within a single string — no separate `Salt`, `HashAlgorithm`, or `Iterations` column is needed.
* No query in this module should ever return `PasswordHash` to the API/application layer except the one internal lookup used to verify credentials during login (see §15). It must never appear in the "Retrieve Logged-in User Information" result set.

---

# 12. Role Storage Strategy

* Roles are stored in a dedicated `Role` table (§2), not as a free-text column on `UserAccount` — this keeps role values constrained to a known, seeded set and consistent with how every other reference/lookup concept is modeled in this project.
* At login, the user's `Role.Code` is resolved via the `RoleId` foreign key and embedded directly into the JWT as a role claim, so that subsequent requests can authorize based on the token alone without a repeated database round trip (business spec §7, §10).

---

# 13. User Status Management

* `UserAccount.IsActive` is the single source of truth for whether a login attempt should succeed — an inactive user must never receive a JWT, regardless of password correctness (business spec §8).
* `UserAccount.IsDeleted` is reserved for actual data removal (e.g., correcting a duplicate/erroneous account), not for routine deactivation — routine deactivation is `IsActive = 0`.
* There is no separate "locked" status in Version 1, consistent with Account Lockout being explicitly out of scope.

---

# 14. Seed Data

* `Role` requires four seed rows, matching the Actors enumerated in the approved business spec exactly: `System Administrator`, `Doctor`, `Pharmacist`, `Receptionist`.
* **`UserAccount` seed data is intentionally not specified in this document.** Since Registration is out of scope and accounts are administrator-provisioned (business spec §8), someone must still exist to create the very first account — this is a real bootstrap question, not a schema question, and is flagged in §20 rather than answered here with an invented default username/password.

---

# 15. Stored Procedures

Named per the project's `usp_<Entity>_<Action>` convention; described here by purpose only, no T-SQL:

* **`usp_UserAccount_GetByUsername`** — used during login only. Returns `UserAccountId`, `Username`, `PasswordHash`, `FullName`, `RoleId` (or the joined `Role.Code`/`Role.DisplayText`), `IsActive`, and `IsDeleted` for a given username. This is the only procedure that should ever return `PasswordHash`.
* **`usp_UserAccount_GetById`** — used for "Retrieve Logged-in User Information," resolved from the validated JWT's user-id claim. Returns the same non-sensitive fields as above **excluding `PasswordHash`** entirely — it should not even be selected, not just filtered out at the application layer.
* **`usp_Role_GetAll`** — not required by any Version 1 authentication flow (role data travels inside the JWT once issued), so it is not being specified as a required V1 procedure. Only relevant once a future admin/user-management UI needs to list available roles (§19).

---

# 16. Data Integrity Rules

* `UserAccount.RoleId` is `NOT NULL` — every user must have exactly one role; there is no "no role" state.
* `UserAccount.Username` is `NOT NULL` and unique (§8).
* Neither table supports hard deletion from the application; `IsDeleted` is the only removal mechanism, consistent with the project-wide soft-delete convention.
* A `Role` cannot be removed while any `UserAccount` references it (enforced by the foreign key in §7).

---

# 17. Performance Considerations

* Login is the hot path for this entire module: the unique index on `Username` (§9) makes that lookup a single index seek, not a scan.
* Because role data is embedded in the JWT at login (§12), authenticated requests do not need to touch `Role` or `UserAccount` again just to authorize — this directly satisfies the "no database lookup per request beyond embedded claims" non-functional requirement in the business spec (§10).
* Both tables are expected to hold small row counts (`Role`: a handful; `UserAccount`: bounded by the number of real system users) — no partitioning, caching, or advanced performance tooling is warranted at this scale.

---

# 18. Security Considerations

* `PasswordHash` is only ever selected by `usp_UserAccount_GetByUsername`, and only for the purpose of verifying a submitted password during login — never returned to any API response.
* Database-level error responses should not distinguish "username not found" from "username found but inactive" — both should look identical to the calling application layer, which is what allows the approved business spec's generic authentication failure message (§8) to actually be enforceable. If the stored procedure behaves differently for the two cases (e.g., different result shapes), that distinction could leak through to the API layer even if the API tries to unify the message.
* Consider SQL Server Transparent Data Encryption (TDE) or column-level encryption for `PasswordHash` as a defense-in-depth measure — noted as a recommendation, not a Version 1 requirement, since the hash itself is already a one-way, salted value.
* Never log `PasswordHash` values, consistent with the project-wide logging rule.

---

# 19. Future Database Enhancements

* A `RefreshToken`/session-tracking table, if Refresh Tokens are introduced in a future version (business spec §16).
* A `UserRole` junction table, if multi-role-per-user support is ever needed (§2).
* Account Lockout fields on `UserAccount` (e.g., `FailedLoginAttemptCount`, `LockoutEndDate`), if Account Lockout is introduced (business spec §16).
* A password history table, if password-reuse prevention is introduced alongside a future Password Reset feature.
* MFA secret storage, if Multi-Factor Authentication is introduced (business spec §16).
* `usp_Role_GetAll` and full CRUD procedures for both tables, once an administrative user-management UI is scoped.

---

# 20. Risks and Assumptions

**Requiring business clarification:**

1. **`Role` vs. the existing `ProfileType` lookup table.** These overlap conceptually but have different value sets (`ProfileType` includes `Nurse`, omits `Receptionist`). Is `Role` meant to be a genuinely distinct concept from `ProfileType` (e.g., "security role" vs. "clinical profile"), or should these be reconciled into one table? This spec proceeds with a separate `Role` table because reusing `ProfileType` as-is would be factually incorrect, but this should be confirmed, not assumed.
2. **Initial administrator account bootstrap.** With Registration out of scope and accounts administrator-provisioned, there is no path to create the very first user. Someone needs to decide how the first `UserAccount` row is created (a one-time manual insert, a seed script with a default password that must be changed on first login, etc.) — this spec deliberately does not invent an answer.
3. **Username case-sensitivity/collation** is unspecified in the business spec and directly affects how the `UNIQUE` constraint and login lookup behave (§8).
4. **Single role per user** is assumed based on how Actors are presented in the business spec (§4), but is not explicitly confirmed as a constraint versus an oversight.

**Other risks:**

* `PasswordHash` column length (`NVARCHAR(256)`) is a conservative estimate, not a verified value — should be confirmed against the actual `PasswordHasher<TUser>` output length before implementation.
* Because there is no session table, revoking a specific user's access before their JWT naturally expires (e.g., an administrator deactivating someone mid-session) is not possible in Version 1 — deactivation only prevents *future* logins, it does not invalidate an already-issued token. This is a direct consequence of the approved "no server-side token state" decision and should be a known, accepted trade-off, not a surprise later.

---

# Consistency Review

Checked against `authentication.md` v1.1: role names match Actors (§4) exactly; `PasswordHash`/no-plain-text requirement matches §9; no session/token table matches §6/§8's stateless logout decision; `FullName` column exists specifically because §6 requires it in "Retrieve Logged-in User Information"; single-role model is consistent with (but not explicitly mandated by) §7. No contradictions found between this document and the approved business specification — the four items above are gaps in the *business* specification that this database design surfaced, not conflicts with it.
