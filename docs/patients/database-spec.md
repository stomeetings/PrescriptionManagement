# Patient Management — Database Design Specification

**Feature:** Patient Management
**Status:** Draft — pending approval
**Version:** 1.0
**Based on:** Patient Management Business Specification v1.0 (approved), Authentication Database Design Specification v1.0 (approved), User Management Database Design Specification v1.0 (approved)

---

# 1. Overview

This document defines the SQL Server database design for the Patient Management module — no SQL scripts, entity classes, repository/service code, or API design are included here, per scope.

`Patient` is a new table (no existing table models it, unlike User Management's reuse of `UserAccount`). It reuses the existing `Gender` lookup table for `GenderId` rather than duplicating it. `Country` is **not** foreign-keyed to any lookup table — no `Country` lookup exists anywhere in Lookup Management's eight categories today, and the business-spec review flagged the system's country/locale scope (NZ-specific identifiers like NHI/NZMC vs. a general system) as an open, unresolved question. Inventing a new `Country` lookup table now would be presumptuous ahead of that decision — see Assumptions §10.

---

# 2. Design Principles

- **Reuse, don't duplicate.** `GenderId` references the existing `Gender` table built for Lookup Management. No second gender table is introduced.
- **System-generated `PatientNumber` is atomic and DB-native.** A SQL Server `SEQUENCE` object generates the numeric portion, formatted and inserted in the same statement as the row itself — avoiding a two-step "insert, then update with a derived number" pattern, and avoiding putting numbering *logic* in the Application layer where it could race between concurrent creates.
- **Optimistic concurrency from day one.** Unlike User Management (where `RowVersion` was added as a recommendation after the fact), this module's business-spec review already flagged that *more* roles (Administrator, Doctor, Receptionist) can concurrently edit the same patient than could ever edit a `UserAccount`. `RowVersion` is included in the initial design, not bolted on later.
- **Soft delete, reserved but unused.** `IsDeleted` exists per the project's standard audit column set, but no `Delete Patient` procedure is defined — matching the approved scope, which only includes Activate/Deactivate. This directly resolves the inconsistency flagged in the business-spec review, where §5's "deleted patients are not physically removed" referenced a capability absent from scope.

---

# 3. Tables

## 3.1 `Patient` (new)

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `PatientId` | `INT IDENTITY` | No | PK. |
| `PatientNumber` | `NVARCHAR(20)` | No | Unique. System-generated (e.g., `PT-000123`) via a `SEQUENCE`, never user-editable — business spec §4.5/§5. |
| `FirstName` | `NVARCHAR(100)` | No | |
| `LastName` | `NVARCHAR(100)` | No | |
| `PreferredName` | `NVARCHAR(100)` | Yes | |
| `DateOfBirth` | `DATE` | No | `DATE`, not `DATETIME2` — a birth date has no time component. |
| `GenderId` | `INT` | No | FK → `Gender.GenderId` (existing Lookup Management table). |
| `MobileNumber` | `NVARCHAR(20)` | Yes | |
| `Email` | `NVARCHAR(256)` | Yes | |
| `AddressLine1` | `NVARCHAR(200)` | Yes | |
| `AddressLine2` | `NVARCHAR(200)` | Yes | |
| `City` | `NVARCHAR(100)` | Yes | |
| `Region` | `NVARCHAR(100)` | Yes | The business spec's "State/Region" — named `Region` to avoid a slash in a column name. |
| `PostalCode` | `NVARCHAR(20)` | Yes | |
| `Country` | `NVARCHAR(100)` | Yes | Plain text, **not** a foreign key — see §1 and Assumptions §10. |
| `NHINumber` | `NVARCHAR(20)` | Yes | Unique when provided (SQL Server's `UNIQUE` constraint permits multiple `NULL`s natively — see §5). |
| `NZMCNumber` | `NVARCHAR(20)` | Yes | Included per this task's explicit field list — **flagged as a likely business-spec error, not a schema concern**; see Assumptions §10. |
| `IsActive` | `BIT` | No, default `1` | Drives Activate/Deactivate (business spec §4.7/§4.8). |
| `Notes` | `NVARCHAR(MAX)` | Yes | Free text. |
| `RowVersion` | `ROWVERSION` | No (system-maintained) | **New, recommended** — see Design Principles. |
| `CreatedDate` | `DATETIME2` | No | |
| `CreatedBy` | `NVARCHAR(100)` | No | |
| `UpdatedDate` | `DATETIME2` | Yes | |
| `UpdatedBy` | `NVARCHAR(100)` | Yes | |
| `IsDeleted` | `BIT` | No, default `0` | Reserved; no delete capability is in scope — see Design Principles. |

## 3.2 `Gender` (existing — unchanged)

No schema changes. Referenced as-is for the `GenderId` foreign key, exactly as it already is for Authentication's `ProfileType`-adjacent concerns (a separate, unrelated table) and any future module needing gender.

## 3.3 `Patient_PatientNumberSequence` (new — SQL Server `SEQUENCE` object, not a table)

Generates the numeric portion of `PatientNumber` atomically (`NEXT VALUE FOR`), avoiding a race condition between two concurrent `usp_Patient_Create` calls that a "read max, add one" approach in application code would risk. The stored procedure formats it (e.g., zero-padded with a `PT-` prefix) at insert time.

---

# 4. Relationships

`Gender (1) ──< (many) Patient` via `Patient.GenderId` — `NOT NULL` FK, default `NO ACTION` on delete/update, matching the same referential pattern already used for `UserAccount.RoleId → Role.RoleId`.

No other foreign keys — `Country`/`Region`/`City` are plain text (see §1), and no relationship to `UserAccount` exists beyond the plain `CreatedBy`/`UpdatedBy` username strings (matching the existing audit-column convention project-wide — these are not foreign keys either, consistent with how `UserAccount.CreatedBy` itself isn't FK'd back to `UserAccount`).

---

# 5. Constraints

- `PK_Patient` — `PatientId`.
- `UQ_Patient_PatientNumber` — unique.
- `UQ_Patient_NHINumber` — unique. SQL Server's `UNIQUE` constraint treats `NULL` as distinct from other `NULL`s, so any number of patients without an NHI number can coexist; only a duplicate *non-null* value is rejected. No filtered index workaround is needed.
- `FK_Patient_Gender` — `GenderId` → `Gender.GenderId`.
- Default constraints: `IsActive = 1`, `IsDeleted = 0`, `CreatedDate = SYSUTCDATETIME()`.
- `NOT NULL`: `PatientNumber`, `FirstName`, `LastName`, `DateOfBirth`, `GenderId`, `IsActive`, `CreatedDate`, `CreatedBy`, `IsDeleted`.
- Nullable: `PreferredName`, `MobileNumber`, `Email`, `AddressLine1`, `AddressLine2`, `City`, `Region`, `PostalCode`, `Country`, `NHINumber`, `NZMCNumber`, `Notes`, `UpdatedDate`, `UpdatedBy`.
- **`DateOfBirth` cannot be in the future** — the business spec's own wording (§5) treats this as enforced, but a plain `CHECK (DateOfBirth <= CAST(SYSUTCDATETIME() AS DATE))` constraint is deliberately **not** included here. A hard DB-level check would also need to encode the business review's still-unresolved "at least one day old" edge case (which may incorrectly reject same-day newborns) — baking an unconfirmed rule into a schema constraint is harder to walk back than enforcing it in the Service layer. Recommend validating this in the Application layer until that business rule is explicitly confirmed; flagged in Assumptions §10.

---

# 6. Indexes (Performance)

| Index | Column(s) | Purpose |
|---|---|---|
| `UQ_Patient_PatientNumber` | `PatientNumber` | Uniqueness + primary lookup. |
| `UQ_Patient_NHINumber` | `NHINumber` | Uniqueness + search by NHI. |
| `IX_Patient_LastName_FirstName` | `LastName, FirstName` | Search/sort by name (same composite pattern as User Management). |
| `IX_Patient_MobileNumber` | `MobileNumber` | Search by mobile. |
| `IX_Patient_Email` | `Email` | Search by email. |
| `IX_Patient_IsActive` | `IsActive` | Filter by Status. |
| `IX_Patient_GenderId` | `GenderId` | Filter by Gender; supports the FK join. |

**Note on search (inherited, unresolved question):** as with User Management, the business spec doesn't specify exact/prefix/contains matching for Search (§4.2). These indexes support prefix-matching and sorting well; a `contains`-style search (`LIKE '%term%'`) won't fully benefit from them regardless of which columns are indexed.

---

# 7. Stored Procedures (purpose only — no SQL yet)

| Procedure | Purpose |
|---|---|
| `usp_Patient_GetAll` | Paginated, unfiltered list — backs the default View Patients screen. |
| `usp_Patient_Search` | Paginated, filtered list — search term matched against `PatientNumber`/`FirstName`/`LastName`/`MobileNumber`/`Email`/`NHINumber` (business spec §4.2), plus optional Status/Gender filters (§4.3). |
| `usp_Patient_GetById` | Full detail for one patient — View Patient Details (§4.6) and the Edit Patient form. |
| `usp_Patient_Create` | Inserts a new patient, generating `PatientNumber` from `Patient_PatientNumberSequence` in the same statement. |
| `usp_Patient_Update` | Updates the editable fields from §4.5. `PatientNumber` is never accepted as an input — it isn't merely ignored if supplied, there is no parameter for it. |
| `usp_Patient_Activate` | Sets `IsActive = 1`. |
| `usp_Patient_Deactivate` | Sets `IsActive = 0`. Business-rule enforcement (e.g., any future restriction on which roles may deactivate — see Assumptions §10) belongs in the Service layer, not this procedure. |

No dedicated "check NHI/PatientNumber exists" procedures — following User Management's precedent, uniqueness is enforced by the constraints themselves, with `Create`/`Update` catching the constraint violation and translating it at the Service layer (avoiding a check-then-act race condition).

---

# 8. Security Considerations

- **Audit trail:** standard `CreatedBy`/`CreatedDate`/`UpdatedBy`/`UpdatedDate` only (business spec §9) — last-modified state, not a full history of every field change. Same limitation already accepted for User Management.
- **Soft delete:** no delete capability is exposed in V1 (only Activate/Deactivate). `IsDeleted` stays reserved and unused, resolving the business-spec inconsistency noted in §1/§2.
- **Data integrity:** `NOT NULL`/`UNIQUE`/FK constraints enforce required fields, `PatientNumber`/`NHINumber` uniqueness, and valid `GenderId` values at the database level, not only in application-layer validation.
- **PII protection:** `Patient` contains substantially more personally identifiable information than `UserAccount` ever did — full name, date of birth, mobile, email, home address, and a national health identifier (NHI). None of this is a password or credential, so it doesn't carry the same "never log" treatment passwords get, but it should still never be logged in full (e.g., log a `PatientId`/`PatientNumber` for correlation, not the patient's name/address/NHI in log messages). This is a stronger version of the same discipline already applied to `Email`/`PhoneNumber` in User Management, worth stating explicitly here given the larger amount of sensitive data involved.

---

# 9. Consistency Review

- `GenderId` reuses the existing `Gender` table exactly as Lookup Management built it — no schema change to that table, no duplicate.
- Audit columns, soft-delete pattern, and `RowVersion` all match the conventions already established by `UserAccount`.
- No schema change is required to any Authentication or User Management table — this module is fully additive.

---

# 10. Assumptions / Open Items

1. **`NZMCNumber` is included because this task's field list explicitly requested it, not because it's confirmed correct.** The business-spec review flagged this as a likely conceptual error — the NZ Medical Council registration number belongs to a practitioner (a Doctor), not a patient. Recommend confirming whether this column should exist on `Patient` at all before implementation, or whether it was meant for a future Doctor/Practitioner profile instead.
2. **No `Country` lookup table exists**, and the business-spec review flagged the system's country/locale scope (NZ-specific vs. general) as unresolved. `Country` is modeled as plain text pending that decision — if the system is confirmed NZ-specific, `Country` may not need to be a field at all; if it's meant to support multiple countries, a real lookup table would be worth introducing then.
3. **"DateOfBirth cannot be in the future" is not enforced as a database `CHECK` constraint**, deliberately, because the related "at least one day old" business rule (which may incorrectly reject same-day newborns, per the business-spec review) is still unconfirmed. Recommend Application-layer validation until that rule is resolved, to keep the exact enforcement easy to adjust.
4. **Email uniqueness is not enforced at the database level.** The business spec's own wording ("Email must be unique if project policy requires") is an unresolved conditional, not a decision — no `UNIQUE` constraint is included on `Email` pending an explicit answer. If uniqueness is confirmed later, this is a straightforward additive constraint.
5. **No business rule differentiates which roles may Activate/Deactivate a patient** (the business-spec review flagged that Doctors/Receptionists have Create/Edit but aren't explicitly granted or denied Activate/Deactivate). This doesn't affect the schema, but will need resolving before `usp_Patient_Activate`/`Deactivate`'s Service-layer authorization is implemented.
6. **`PatientNumber`'s exact format** (prefix, zero-padding width) is this document's own proposal (`PT-000123`), not something the business spec specifies — confirm before implementation.
7. **Search matching semantics** (exact/prefix/contains) remain unspecified, same open question as User Management's.
