# User Management — Database Design Specification

**Feature:** User Management
**Status:** Draft — pending approval
**Version:** 1.0
**Based on:** User Management Business Specification v1.0 (approved), Authentication Database Design Specification v1.0 (approved — `UserAccount`, `Role` tables)

---

# 1. Overview

This document defines the SQL Server database design for the User Management module — no SQL scripts, stored procedure implementations, entity classes, repository/service code, or API design are included here, per scope.

The central design decision: **`UserAccount` (already built for Authentication) is extended, not duplicated.** It already models exactly the entity User Management manages — a system user with a username, password hash, role, and active status. Introducing a second "Users" table alongside it would split identity/credential data across two tables for no reason and risk drifting out of sync with what Authentication already relies on. Every change below is additive to the existing table.

---

# 2. Design Principles

- **Reuse, don't duplicate.** `UserAccount` remains the single table of record for system users. No new `Users`/`UserRoles` tables are introduced.
- **Single role per user, unchanged.** Both the approved Authentication spec and this module's business spec (§1: "Version 1 supports a single role per user") confirm this — `RoleId` stays a plain `NOT NULL` foreign key, not a join table.
- **Backward compatible with Authentication.** Every new column is additive (nullable or defaulted), so the existing `UserAccount` entity, DTOs, JWT claims, and stored procedures (`usp_UserAccount_GetByUsername`, `usp_UserAccount_GetById`) continue to work unmodified. `FullName` is retained exactly as-is for this reason (see §3.1) rather than being replaced by `FirstName`/`LastName`, per your prior decision.

---

# 3. Tables

## 3.1 `UserAccount` (existing table — extended)

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `UserAccountId` | `INT IDENTITY` | No | PK (existing) |
| `Username` | `NVARCHAR(100)` | No | Unique (existing) |
| `PasswordHash` | `NVARCHAR(256)` | No | (existing) |
| `FullName` | `NVARCHAR(200)` | No | (existing) Retained unchanged so Authentication's JWT claims, DTOs, and frontend keep working without modification. Populated as `FirstName + ' ' + LastName` by the Application layer whenever a user is created or edited through this module — not a computed SQL column, to keep business logic out of the schema. |
| `FirstName` | `NVARCHAR(100)` | No | **New.** |
| `LastName` | `NVARCHAR(100)` | No | **New.** |
| `Email` | `NVARCHAR(256)` | No | **New.** Unique. |
| `PhoneNumber` | `NVARCHAR(20)` | Yes | **New.** Optional, per business spec §5.4. |
| `RoleId` | `INT` | No | FK → `Role.RoleId` (existing, unchanged). |
| `IsActive` | `BIT` | No, default `1` | (existing) |
| `LastLoginDate` | `DATETIME2` | Yes | **New.** Populated by Authentication's login flow, not by any User Management screen — see Assumptions §10.1. |
| `MustChangePassword` | `BIT` | No, default `0` | **New.** Supports business spec §5.9 ("must change password at next login"); enforcement is not yet defined — see Assumptions §10.2. |
| `RowVersion` | `ROWVERSION` | No (system-maintained) | **New, recommended.** Optimistic concurrency for two Administrators editing the same user simultaneously — see Assumptions §10.3. |
| `CreatedDate` | `DATETIME2` | No | (existing) |
| `CreatedBy` | `NVARCHAR(100)` | No | (existing) |
| `UpdatedDate` | `DATETIME2` | Yes | (existing) |
| `UpdatedBy` | `NVARCHAR(100)` | Yes | (existing) |
| `IsDeleted` | `BIT` | No, default `0` | (existing) Reserved; no Delete User capability is exposed in V1 (only Activate/Deactivate) — see §8. |

## 3.2 `Role` (existing — unchanged)

No schema changes. Referenced as-is for the `RoleId` foreign key and the Create/Edit User role dropdown.

---

# 4. Relationships

`Role (1) ──< (many) UserAccount` via `UserAccount.RoleId` — identical cardinality and referential behavior (`NOT NULL` FK, default `NO ACTION` on delete) to what Authentication already established. No new relationships are introduced.

---

# 5. Constraints

- `PK_UserAccount` — existing, unchanged.
- `UQ_UserAccount_Username` — existing, unchanged.
- `UQ_UserAccount_Email` — **new.**
- `FK_UserAccount_Role` — existing, unchanged.
- Default constraints: `IsActive = 1`, `CreatedDate = SYSUTCDATETIME()`, `IsDeleted = 0` (all existing), `MustChangePassword = 0` (new).
- `NOT NULL`: `Username`, `PasswordHash`, `FullName`, `FirstName`, `LastName`, `Email`, `RoleId`, `IsActive`, `CreatedDate`, `CreatedBy`, `IsDeleted`, `MustChangePassword`.
- Nullable: `PhoneNumber`, `LastLoginDate`, `UpdatedDate`, `UpdatedBy`.

---

# 6. Indexes (Performance)

| Index | Column(s) | Purpose |
|---|---|---|
| `UQ_UserAccount_Username` | `Username` | Existing — uniqueness + login lookup. |
| `UQ_UserAccount_Email` | `Email` | **New** — uniqueness + supports Search by Email. |
| `IX_UserAccount_RoleId` | `RoleId` | Existing — supports Filter by Role. |
| `IX_UserAccount_IsActive` | `IsActive` | **New** — supports Filter by Status. |
| `IX_UserAccount_LastName_FirstName` | `LastName, FirstName` | **New**, composite — supports Search/sort by Name. |

**Note on search:** the approved business spec doesn't specify whether Search by Name/Username/Email is exact, prefix, or partial (`contains`) matching. The indexes above support prefix-matching and sorting well; a partial/`contains` search (`LIKE '%term%'`) won't fully benefit from a standard B-tree index. If broader fuzzy search is needed later, SQL Server Full-Text Search should be considered — out of scope for V1.

---

# 7. Stored Procedures (purpose only — no SQL yet)

| Procedure | Purpose |
|---|---|
| `usp_User_GetAll` | Returns a paginated list of all users, no filters — backs the default View Users screen. |
| `usp_User_Search` | Returns a paginated, filtered list; accepts an optional search term (matched against `Username`/`FirstName`/`LastName`/`Email`) and optional Role/Status filters. A superset of `GetAll` — `GetAll` stays as the simple, filter-free default list load. |
| `usp_User_GetById` | Returns full details for one user — backs View User Details and populates the Edit User form. Never selects `PasswordHash`. |
| `usp_User_Create` | Inserts a new `UserAccount` row (`FirstName`, `LastName`, `Username`, `Email`, `PhoneNumber`, `RoleId`, `PasswordHash` from the generated temporary password, `IsActive`, derived `FullName`). |
| `usp_User_Update` | Updates the editable fields from business spec §5.5 (`FirstName`, `LastName`, `Email`, `PhoneNumber`, `RoleId`, `IsActive`) plus recomputed `FullName`. Never touches `PasswordHash`. |
| `usp_User_Activate` | Sets `IsActive = 1` for a specific user. Kept as a dedicated, single-purpose procedure distinct from the general `Update` form. |
| `usp_User_Deactivate` | Sets `IsActive = 0` for a specific user. Business-rule enforcement (cannot deactivate self; "last Administrator" protection, once approved) belongs in the Service layer, not this procedure. |
| `usp_User_ResetPassword` | Updates `PasswordHash` to a new value (generated and hashed by the Application layer, following Authentication's approved hashing strategy) and sets `MustChangePassword = 1`. |
| `usp_UserAccount_UpdateLastLogin` | **New, but conceptually belongs to Authentication's login flow**, not a User Management screen. Sets `LastLoginDate = SYSUTCDATETIME()` for the authenticating user. See Assumptions §10.1 — the approved Authentication API spec doesn't currently call this. |
| `usp_Role_GetAll` | **Not new** — already defined in Authentication's database spec (deferred there as "future admin UI only"). Needed now to populate the Role dropdown on Create/Edit User forms; reusing that existing definition rather than redefining it here. |

No dedicated "check username/email exists" procedures are defined. Uniqueness is enforced by the `UNIQUE` constraints themselves; `Create`/`Update` should catch the constraint violation and translate it into a friendly validation error at the Service layer — this avoids a check-then-act race condition between a separate existence check and the actual insert/update.

---

# 8. Security Considerations

- **Password hash storage:** identical treatment to Authentication — only ever written by `usp_User_Create`/`usp_User_ResetPassword`, and never selected by any User Management read procedure (`GetAll`/`Search`/`GetById` all exclude `PasswordHash`).
- **Soft delete:** no Delete User capability is exposed in V1 — only Activate/Deactivate, both operating on `IsActive`. The existing `IsDeleted` column stays reserved and unused by this module. (This resolves the inconsistency flagged in the business-spec review, where §6's "cannot delete themselves" rule didn't correspond to any actual delete feature in scope.)
- **Audit trail:** standard `CreatedBy`/`CreatedDate`/`UpdatedBy`/`UpdatedDate` only, matching the approved business spec §10 exactly. This provides last-modified state, not a full history of every activate/deactivate/role-change event — already flagged as a gap in the business-spec review; not resolved here since the approved spec doesn't request more than this.
- **Sensitive fields:** `Email`, `PhoneNumber`, and temporary passwords must never be written to logs, consistent with the project's existing logging rules — this is an application-layer discipline, not something the schema itself enforces.
- **Data integrity:** `NOT NULL` and `UNIQUE` constraints enforce required fields and Username/Email uniqueness at the database level, not only in application-layer validation.

---

# 9. Consistency Review

- **Role naming:** this spec uses `Role.Code = SYSTEM_ADMINISTRATOR` consistently, matching Authentication's approved actor naming and the role-mapping decision already made — not the business spec document's literal "Administrator" wording.
- `FullName` is retained exactly as Authentication depends on it; `FirstName`/`LastName` are purely additive.
- No schema change is required to any Authentication entity, DTO, stored procedure, or JWT claim — this design is fully backward compatible with the already-shipped Authentication feature.

---

# 10. Assumptions / Open Items

1. **`LastLoginDate` depends on a change to Authentication's login flow.** Populating it requires `AuthService.LoginAsync` (already approved and shipped) to call `usp_UserAccount_UpdateLastLogin` after a successful login. This is a change to an already-approved module, not something User Management can deliver alone — needs your explicit sign-off before implementation.
2. **`MustChangePassword` has no enforcement mechanism yet.** The column can be set by Reset Password, but nothing in the approved Authentication API spec currently checks it or forces a password change at next login. Recommend deciding whether to expand Authentication's scope for this, or treat the flag as informational-only for V1.
3. **`RowVersion` is a recommendation, not an explicit business-spec requirement.** It addresses the concurrent-edit risk flagged in the business-spec review (two Administrators editing the same user simultaneously). Flagging in case you'd rather defer it.
4. **`usp_Role_GetAll` reuses Authentication's existing spec entry** rather than being redefined here — confirming that's acceptable rather than treating it as a new procedure this module owns.
5. **The "last Administrator" protection rule** (flagged as missing in the business-spec review) isn't reflected in this schema, since it wasn't part of the approved business-spec text. It's enforceable at the Service layer regardless of schema, so no table/column design is blocked on it — but it's worth resolving before implementation.
6. **Search semantics remain unspecified.** The indexes in §6 assume prefix/sort-oriented usage; if partial (`contains`) matching is required, revisit whether these indexes are sufficient at implementation time.
