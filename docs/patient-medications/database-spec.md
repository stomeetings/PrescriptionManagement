# Patient Medication Management — Database Design Specification

**Feature:** Patient Medication Management
**Status:** Draft — pending approval
**Version:** 1.0
**Based on:** `docs/patient-medications/patient-medication-management.md` (approved), `docs/patients/database-spec.md` (approved, precedent), `docs/medicines/database-spec.md` (approved, precedent), `docs/Lookup/database-spec.md` (approved — see §2 for why this spec deviates from this task's literal field list)

---

# 1. Overview

This document defines the SQL Server schema for Patient Medication Management — a patient's current-and-historical medication list, distinct from a Prescription (business spec §1). No SQL scripts, stored procedures, entity classes, or API design are included here, per scope.

**This task's own field list conflicts with already-approved project architecture in several places.** Rather than silently follow the literal wording, §2 documents every reconciliation made and why, before the table definitions in §3 use the corrected names throughout.

---

# 2. Reconciliation with Approved Architecture (read this first)

1. **There is no `LookupValue` table.** The task's field list names five FKs as "`→ LookupValue`" (`DoseUnitLookupId`, `FrequencyLookupId`, `DurationUnitLookupId`, `SourceLookupId`, `StatusLookupId`). The approved Lookup Management database spec explicitly **rejected** a generic `LookupCategory`/`LookupValue` model in favor of one dedicated table per category (`Gender`, `MedicineForm`, `MedicineRoute`, `DoseUnit`, `Frequency`, `DurationUnit`, `PrescriptionStatus`, `ProfileType` — no `LookupValue` table exists anywhere in this schema). This spec resolves each of the five references individually:
   - `DoseUnitLookupId` → **`DoseUnitId`**, FK → existing `DoseUnit.DoseUnitId`.
   - `FrequencyLookupId` → **`FrequencyId`**, FK → existing `Frequency.FrequencyId`.
   - `DurationUnitLookupId` → **`DurationUnitId`**, FK → existing `DurationUnit.DurationUnitId`.
   - `StatusLookupId` → **`PatientMedicationStatusId`**, FK → a **new** dedicated table `PatientMedicationStatus` (§3.3) — no existing lookup table models a simple Active/Stopped medication status (`PrescriptionStatus` is a different, richer concept for the future Prescription module, per the approved business spec §5.9/§6's explicit two-state framing).
   - `SourceLookupId` → **`PatientMedicationSourceId`**, FK → a **new** dedicated table `PatientMedicationSource` (§3.4) — this field appears in this task's requirements but was never mentioned in the approved business specification; kept because it directly supports this task's own "Future Compatibility" requirements (NZ ePrescription integration, Medication Reconciliation — §9), flagged in Assumptions §11 item 1.
2. **There is no `User` table.** `PrescribedByUserId` → **`PrescribedByUserAccountId`**, FK → the existing `UserAccount.UserAccountId` (the actual table name from Authentication/User Management).
3. **Two fields required by the already-approved business specification are missing from this task's literal field list, and are added here to satisfy it:**
   - `StoppedBy` / `StoppedDate` — the approved business spec §10 explicitly requires these as audit fields ("Stopped By, Stopped Date"), distinct from `UpdatedBy`/`UpdatedDate` (an ordinary field edit is not the same audit event as stopping a medication).
   - `ResumedFromPatientMedicationId` — the approved business spec §6/§15 item 6 requires "a complete audit trail" including "traceability from a resumed record back to the medication it superseded," and explicitly leaves the mechanism to this Database Specification. This spec resolves it as a nullable self-referencing foreign key (§3.1).
3. **`RowVersion` is added, beyond the task's literal list**, matching the same "optimistic concurrency from day one" reasoning already applied to `Patient` and `Medicine` (multiple roles — here, Administrator and Doctor — can plausibly edit the same record concurrently).
4. **`IsDeleted` is added, beyond the task's literal list**, matching the project's standard audit-column set applied to every other table, even though no delete capability is in scope (business spec §4) — reserved but unused, same precedent as every prior module.

---

# 3. Tables

## 3.1 `PatientMedication` (new)

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `PatientMedicationId` | `INT IDENTITY` | No | PK. |
| `PatientId` | `INT` | No | FK → `Patient.PatientId`. |
| `MedicineId` | `INT` | No | FK → `Medicine.MedicineId`. Strength is **not** duplicated onto this table — `Medicine` already enforces one row per Name+Strength+Form (`UQ_Medicine_Name_Strength_Form`), so "same Medicine + Strength" (business spec §6) reduces to "same `MedicineId`." |
| `Dose` | `DECIMAL(10,3)` | No | Numeric amount per administration (e.g. `500`), paired with `DoseUnitId`. Decimal (not `INT`) to allow fractional doses (e.g. half a tablet). |
| `DoseUnitId` | `INT` | No | FK → existing `DoseUnit.DoseUnitId`. See §2 item 1. |
| `FrequencyId` | `INT` | No | FK → existing `Frequency.FrequencyId`. See §2 item 1. |
| `Duration` | `INT` | No | Numeric course length (e.g. `7`), paired with `DurationUnitId`. |
| `DurationUnitId` | `INT` | No | FK → existing `DurationUnit.DurationUnitId`. See §2 item 1. |
| `Quantity` | `DECIMAL(10,2)` | No | Total amount supplied/dispensed for this course. |
| `Instructions` | `NVARCHAR(500)` | No | Patient-facing directions (e.g. "Take one tablet twice daily with food"). Required per business spec §5.4. |
| `PRN` | `BIT` | No, default `0` | "As needed" indicator. |
| `StartDate` | `DATE` | No | `DATE`, not `DATETIME2` — matches `Patient.DateOfBirth`'s precedent (no time component needed). |
| `EndDate` | `DATE` | Yes | Optional per business spec §5.4. |
| `ClinicalNotes` | `NVARCHAR(MAX)` | Yes | Optional free text. |
| `PrescribedByUserAccountId` | `INT` | Yes | FK → `UserAccount.UserAccountId` (see §2 item 2). Nullable: distinct from `CreatedBy` — the clinician clinically responsible for this medication may differ from whoever operated the data-entry screen (e.g. a Receptionist transcribing a Doctor's verbal order), and not every entry necessarily has an identified prescriber (e.g. a patient-reported over-the-counter medication). This field was not in the approved business specification's field list; introduced by this task's own requirements. |
| `PatientMedicationSourceId` | `INT` | No | FK → new `PatientMedicationSource` (§3.4). See §2 item 1. |
| `PatientMedicationStatusId` | `INT` | No | FK → new `PatientMedicationStatus` (§3.3). See §2 item 1. |
| `IsCurrent` | `BIT` | No, default `1` | The actual business-meaningful flag driving "current medication list" (business spec §5.1) — `true` for the one active instance in a Stop/Resume chain, `false` for every superseded/historical row. |
| `IsActive` | `BIT` | No, default `1` | Included because the task's field list requires it, but **likely redundant with `IsCurrent`** — see Assumptions §11 item 2. No business capability in the approved specification (no "Deactivate Patient Medication") gives this flag independent meaning the way `IsActive` drives real behavior on `Patient`/`Medicine`. |
| `ResumedFromPatientMedicationId` | `INT` | Yes | Self-referencing FK → `PatientMedication.PatientMedicationId`. Added to satisfy the approved business spec's traceability requirement (§2 item 3 above). `NULL` for a medication that was never a resume of a prior stopped entry. |
| `RowVersion` | `ROWVERSION` | No (system-maintained) | **Added beyond the task's literal list** — see §2 item 3(second). |
| `CreatedDate` | `DATETIME2` | No | |
| `CreatedBy` | `NVARCHAR(100)` | No | |
| `UpdatedDate` | `DATETIME2` | Yes | |
| `UpdatedBy` | `NVARCHAR(100)` | Yes | |
| `StoppedDate` | `DATETIME2` | Yes | **Added to satisfy the approved business spec** — see §2 item 3(first). `NULL` until the medication is stopped; never reset once set (a stopped record is permanently read-only per business spec §5.7). |
| `StoppedBy` | `NVARCHAR(100)` | Yes | Same reasoning as `StoppedDate`. |
| `IsDeleted` | `BIT` | No, default `0` | Reserved; no delete capability is in scope — see §2 item 4. |

## 3.2 `PatientMedicationHistory` (new)

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `HistoryId` | `INT IDENTITY` | No | PK. |
| `PatientMedicationId` | `INT` | No | FK → `PatientMedication.PatientMedicationId`. |
| `Action` | `NVARCHAR(50)` | No | One of `CREATED`, `UPDATED`, `STOPPED`, `RESUMED` (enforced by `CHECK`, §5 — a small, genuinely fixed set, unlike lookup `Code` values elsewhere in the project that deliberately have no format `CHECK`). |
| `PreviousValues` | `NVARCHAR(MAX)` | Yes | JSON snapshot of the row before the change. `NULL` for a `CREATED` action (nothing existed before). Validated by `CHECK (PreviousValues IS NULL OR ISJSON(PreviousValues) = 1)` — SQL Server 2022 has no native JSON column type, so JSON is stored as validated `NVARCHAR(MAX)`, consistent with the project's SQL Server 2022+ compatibility requirement. |
| `NewValues` | `NVARCHAR(MAX)` | Yes | JSON snapshot of the row after the change. Same `ISJSON` validation. |
| `ChangedBy` | `NVARCHAR(100)` | No | |
| `ChangedDate` | `DATETIME2` | No, default `SYSUTCDATETIME()` | |

**Why this table exists alongside `PatientMedication`'s own Stop/Resume row-per-cycle model, rather than duplicating it:** the approved business spec's Resume design (§5.8) already produces a natural history via multiple rows — one per Stop/Resume cycle. What that row-based history does **not** capture is a field-level edit to a still-*Active* record (business spec §5.5 "Edit Medication" updates the existing row in place). `PatientMedicationHistory` fills exactly that gap — an append-only log of every significant change (including edits) — and is the first dedicated history/audit-log table in this project, because "View Medication History" (business spec §5.9) is a first-class, user-facing functional requirement here, unlike any prior module where audit was just `CreatedBy`/`UpdatedBy` columns with no dedicated history screen.

## 3.3 `PatientMedicationStatus` (new — dedicated lookup table, per the established one-table-per-category pattern)

Same column template as every other lookup table in this project (`Code`, `DisplayText`, `DisplayOrder`, `IsActive`, audit columns, `IsDeleted`) — see `docs/Lookup/database-spec.md` §4 for the shared template this reuses exactly.

Documented seed values only (no SQL, per scope): `ACTIVE`, `STOPPED` — matching the approved business spec's literal two-state model. Additive room exists for a future value (e.g. `SUPERSEDED`, distinguishing "stopped because resumed" from "stopped and not resumed") without a schema change, if that distinction is ever wanted.

## 3.4 `PatientMedicationSource` (new — dedicated lookup table, same pattern)

Documented seed values only: `MANUAL_ENTRY`, `PRESCRIPTION`, `IMPORTED` — anticipating the future Prescription Management and Medication Reconciliation integrations named in this task's Future Compatibility requirements (§9).

## 3.5 `Patient`, `Medicine`, `DoseUnit`, `Frequency`, `DurationUnit`, `UserAccount` (existing — unchanged)

No schema changes to any of these. Referenced as-is for their respective foreign keys.

---

# 4. Relationships

- `Patient (1) ──< (many) PatientMedication` via `PatientMedication.PatientId` — `NOT NULL` FK, `NO ACTION`.
- `Medicine (1) ──< (many) PatientMedication` via `PatientMedication.MedicineId` — `NOT NULL` FK, `NO ACTION`.
- `DoseUnit (1) ──< (many) PatientMedication` via `DoseUnitId` — `NOT NULL` FK, `NO ACTION`.
- `Frequency (1) ──< (many) PatientMedication` via `FrequencyId` — `NOT NULL` FK, `NO ACTION`.
- `DurationUnit (1) ──< (many) PatientMedication` via `DurationUnitId` — `NOT NULL` FK, `NO ACTION`.
- `UserAccount (1) ──< (many) PatientMedication` via `PrescribedByUserAccountId` — nullable FK, `NO ACTION`. Note: `CreatedBy`/`UpdatedBy`/`StoppedBy`/`ChangedBy` remain plain audit username strings, not foreign keys, matching this project's universal audit-column convention — `PrescribedByUserAccountId` is the one deliberate exception, because it's a genuine clinical-responsibility reference the future Prescription module may need to join on, not merely an audit trail.
- `PatientMedicationStatus (1) ──< (many) PatientMedication` via `PatientMedicationStatusId` — `NOT NULL` FK, `NO ACTION`.
- `PatientMedicationSource (1) ──< (many) PatientMedication` via `PatientMedicationSourceId` — `NOT NULL` FK, `NO ACTION`.
- `PatientMedication (1) ──< (0 or 1) PatientMedication` via `ResumedFromPatientMedicationId` — self-referencing, nullable FK, `NO ACTION`. Forms a linked chain of Stop→Resume cycles for the same clinical course.
- `PatientMedication (1) ──< (many) PatientMedicationHistory` via `PatientMedicationHistory.PatientMedicationId` — `NOT NULL` FK, `NO ACTION`.
- **Forward reference (not created by this spec):** the future Prescription Management module is expected to add a nullable `PrescriptionItem.PatientMedicationId` FK into this table (business spec §11.3 — a Prescription may originate from an existing Patient Medication, or introduce a brand-new one) — see §9.

---

# 5. Constraints

- `PK_PatientMedication` — `PatientMedicationId`. `PK_PatientMedicationHistory` — `HistoryId`. `PK_PatientMedicationStatus` — `PatientMedicationStatusId`. `PK_PatientMedicationSource` — `PatientMedicationSourceId`.
- **`UQ_PatientMedication_Patient_Medicine_Current`** — a **filtered unique index** (SQL Server's correct tool for "unique only among a subset of rows," not a plain `UNIQUE` constraint): `UNIQUE (PatientId, MedicineId) WHERE IsCurrent = 1`. This is the actual database-level enforcement of business spec §6's "a patient cannot have duplicate active medications with the same Medicine + Strength" — expressed as `IsCurrent = 1` rather than a separate status check, since `IsCurrent` is defined as the flag that means exactly "this is the one active instance." (Whether `Strength` alone, without `MedicineId`, should factor in is moot — see §3.1's note that `Medicine` already fixes Strength per row.)
- `CK_PatientMedication_EndDate` — `CHECK (EndDate IS NULL OR EndDate >= StartDate)`. Unlike `Patient.DateOfBirth`'s "cannot be in the future" rule (deliberately left to the Application layer due to an unresolved edge case), this rule has no such ambiguity and is safe to enforce directly in the database.
- `CK_PatientMedicationHistory_Action` — `CHECK (Action IN ('CREATED', 'UPDATED', 'STOPPED', 'RESUMED'))`.
- `CK_PatientMedicationHistory_PreviousValuesJson` / `CK_PatientMedicationHistory_NewValuesJson` — `CHECK (... IS NULL OR ISJSON(...) = 1)`, one per JSON column.
- `FK_PatientMedication_Patient`, `FK_PatientMedication_Medicine`, `FK_PatientMedication_DoseUnit`, `FK_PatientMedication_Frequency`, `FK_PatientMedication_DurationUnit`, `FK_PatientMedication_PrescribedByUserAccount`, `FK_PatientMedication_PatientMedicationStatus`, `FK_PatientMedication_PatientMedicationSource`, `FK_PatientMedication_ResumedFrom` (self-referencing), `FK_PatientMedicationHistory_PatientMedication`.
- Default constraints: `PRN = 0`, `IsCurrent = 1`, `IsActive = 1`, `IsDeleted = 0`, `CreatedDate = SYSUTCDATETIME()` (all on `PatientMedication`); `ChangedDate = SYSUTCDATETIME()` (on `PatientMedicationHistory`); the standard `IsActive = 1`/`IsDeleted = 0`/`CreatedDate` defaults on both new lookup tables.
- **"`IsCurrent` must be consistent with Status" (business constraint) is not enforced by a `CHECK` constraint.** A `CHECK` constraint cannot cleanly join to `PatientMedicationStatus` to confirm `PatientMedicationStatusId` actually corresponds to the `ACTIVE` row without a scalar function — a pattern this project has consistently avoided (matching how `Patient`'s DOB edge case and `Medicine`'s ATC-code shape decisions were also kept out of the database layer where the check would need to be either too clever or too loose). This consistency is an Application/Service-layer responsibility: `IsCurrent` and `PatientMedicationStatusId` must always be set together, atomically, in the same statement. Flagged as an assumption, §11 item 3.

---

# 6. Indexes (Performance)

| Index | Column(s) | Purpose |
|---|---|---|
| `UQ_PatientMedication_Patient_Medicine_Current` | `PatientId, MedicineId` (filtered `WHERE IsCurrent = 1`) | Uniqueness (§5) + doubles as the primary index for "does this patient already have this medicine active" checks. |
| `IX_PatientMedication_Patient_IsCurrent` | `PatientId, IsCurrent` | Backs "View Patient Medication List" (business spec §5.1 — current medications for one patient), requested explicitly. |
| `IX_PatientMedication_Patient_Medicine` | `PatientId, MedicineId` | Requested explicitly; supports lookups distinct from the filtered-unique index above (that one only indexes `IsCurrent = 1` rows — this one covers all rows, needed for "View Medication History," §5.9, which must see stopped rows too). |
| `IX_PatientMedication_Patient_Status` | `PatientId, PatientMedicationStatusId` | Requested explicitly (as `PatientId + StatusLookupId`); supports Filter by Active/Inactive (§5.3) scoped to one patient. |
| `IX_PatientMedication_MedicineId` | `MedicineId` | Requested explicitly; supports the FK join and a future "which patients are on this medicine" cross-patient query. |
| `IX_PatientMedication_StartDate` | `StartDate` | Requested explicitly; supports the Start Date range filter (§5.3). |
| `IX_PatientMedication_EndDate` | `EndDate` | Requested explicitly; supports the End Date range filter (§5.3). |

**Deliberately not created, despite being requested, because they are subsumed by a composite index's leftmost column:**
- A standalone `IX_PatientMedication_PatientId` — already covered by `IX_PatientMedication_Patient_IsCurrent`'s, `IX_PatientMedication_Patient_Medicine`'s, and `IX_PatientMedication_Patient_Status`'s leftmost `PatientId` column. Adding a fourth index on the same leading column would only add write overhead with no read benefit any of the other three don't already provide.
- A standalone `IX_PatientMedication_IsCurrent` — cross-patient "all current medications regardless of patient" is not a query business spec §5 describes (List/Search/Filter are always effectively patient-scoped or, per §5.2's cross-patient search, name/medicine-scoped, not raw-status-scoped); if that access pattern turns out to be needed, this index is cheap to add later.
- A standalone `IX_PatientMedication_IsActive` — per §3.1's note, `IsActive` currently has no distinct query need from `IsCurrent`; add only if `IsActive` is later given real, independent meaning (Assumptions §11 item 2).

**Note on cross-patient search (business spec §5.2, Risk §13):** searching by Patient Name requires joining to `Patient` and filtering on `Patient.FirstName`/`LastName`, which already have `IX_Patient_LastName_FirstName` from the approved Patient database spec — no new index is needed on the `Patient` side for this. The same leading-wildcard `LIKE` caveat already documented for `Patient`/`Medicine` search applies here too.

---

# 7. Security Considerations

- **Clinical PHI, at a higher sensitivity than any prior module.** `Instructions` and `ClinicalNotes` carry patient clinical detail; `PatientMedicationHistory.PreviousValues`/`NewValues` carry full historical snapshots of the same. Standard logging discipline (log `PatientMedicationId`/`PatientId` for correlation, never full row or JSON content) applies with extra emphasis here, since a history table's entire purpose is retaining exactly the data that must never appear in an application log.
- **`PatientMedicationHistory` is append-only by design** — no update/delete path is defined for it, consistent with an audit log's purpose; this should be enforced at the Application/Repository layer (no `Update`/`Delete` method should ever be written against this table) since the database schema alone (no `IsDeleted` column on this table, deliberately) doesn't structurally prevent a delete statement.
- Role-based restrictions (Administrator/Doctor full access, Pharmacist/Receptionist view-only, per the approved business spec §8) are enforced at the Application/API layer, not by this schema — no column here encodes authorization.

---

# 8. Consistency Review

- `DoseUnitId`/`FrequencyId`/`DurationUnitId` reuse the existing Medicine Management lookup tables exactly as built — no duplicate lookup tables.
- Audit columns, soft-delete pattern (`IsDeleted`), and `RowVersion` all match the conventions established by `Patient`/`Medicine`.
- No schema change is required to `Patient`, `Medicine`, `UserAccount`, `DoseUnit`, `Frequency`, or `DurationUnit` — this module is fully additive.

---

# 9. Future Compatibility

- **Prescription Management** — additive-only: a future `PrescriptionItem.PatientMedicationId` (nullable) can reference this table without any shape change here, matching business spec §11.3's requirement that a Prescription may originate from an existing Patient Medication or introduce a new one.
- **Repeat Prescriptions** — `Duration`/`DurationUnitId`/`Quantity`/`StartDate`/`EndDate` give a future repeat/refill-due calculation the data it needs without new columns; `PatientMedicationSourceId`'s `PRESCRIPTION` value and `ResumedFromPatientMedicationId`'s chain both provide a hook for "what is this a repeat of."
- **Medication History** — already a first-class part of this design (§3.2's `PatientMedicationHistory`, plus the row-per-Stop/Resume-cycle chain).
- **Medication Reconciliation** — `PatientMedicationSourceId`'s `IMPORTED` value anticipates external-source reconciliation; the business spec's decision that Medicine details are a live reference (not a snapshot) keeps reconciliation comparing against one current source of truth rather than stale copies.
- **NZ ePrescription integration** — **a known, deliberate gap, not addressed by this schema.** No external message/reference identifier column exists yet (e.g. an NZePS prescription reference number). Adding one speculatively now, without a concrete integration requirement, would be exactly the kind of premature field this project's conventions avoid (per `CLAUDE.md`'s "don't design for hypothetical future requirements"). Flagged explicitly here so it isn't mistaken for an oversight — recommend revisiting when NZ ePrescription integration is actually scoped.

---

# 10. Scalability Confirmation

- The business spec's own NFR (§9) explicitly calls out "large patient medication histories" as a new, larger scale consideration than any prior module — both per-patient row count (a long-term patient could accumulate dozens of historical entries) and total cross-patient table size.
- The filtered unique index (§5/§6) keeps the hottest query ("does this patient already have this active") cheap regardless of how large the *historical* (non-current) portion of the table grows, since it only ever indexes `IsCurrent = 1` rows.
- `PatientMedicationHistory` is expected to grow faster than `PatientMedication` itself (every edit adds a row, not just every Stop/Resume) — its own `PatientMedicationId` FK index keeps "show me this medication's change log" cheap independent of the table's total size.
- As with every prior module, leading-wildcard search (Patient Name / Medicine Name / Generic Name, business spec §5.2) will not scale as cleanly as prefix search would at large volumes — carried forward as a known, already-documented trade-off, not newly introduced here.

---

# 11. Assumptions / Open Items

1. **`PatientMedicationSourceId` was introduced by this task's requirements, not the approved business specification**, which never mentions a "source" concept. Kept because it directly serves this task's own Future Compatibility requirements (NZ ePrescription, Medication Reconciliation) — confirm this addition is wanted, since it's schema surface the business spec didn't ask for.
2. **`IsActive` is likely redundant with `IsCurrent`.** Both were requested by this task; no business rule in the approved specification distinguishes them (there is no "Deactivate Patient Medication" capability separate from Stop/Resume). Recommend confirming whether `IsActive` should be dropped, or given a genuinely distinct meaning, before implementation — carrying two same-meaning flags invites them to drift out of sync.
3. **"`IsCurrent` must be consistent with `PatientMedicationStatusId`" is an Application-layer rule, not a database `CHECK` constraint** — see §5's reasoning. Confirm this is the intended enforcement boundary.
4. **`PrescribedByUserAccountId` is nullable and independent of `CreatedBy`** — confirm this two-identity model (who clinically ordered it vs. who entered the data) is actually wanted; if every entry's prescriber is always the same as whoever created the record, this field collapses to a duplicate of `CreatedBy` and could be removed.
5. **Whether `Dose`/`Quantity` need more precision than `DECIMAL(10,3)`/`DECIMAL(10,2)`** (e.g. very small pediatric or veterinary-style dosing) is unconfirmed — chosen as a reasonable general-purpose default, not derived from a stated requirement.
6. **`Instructions`'s `NVARCHAR(500)` length is this document's own choice**, not specified by the task or business spec — confirm before implementation.
7. **Whether a future `SUPERSEDED` status value (distinguishing "stopped because resumed" from "stopped and not resumed") should be part of V1's seed data** rather than added later is left open — V1 seeds only `ACTIVE`/`STOPPED`, matching the business spec's literal two-state description.
