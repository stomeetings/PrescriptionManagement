# Prescription Management — Database Design Specification (Phase 1: Save Draft)

**Feature:** Prescription Management (Phase 1)
**Status:** Draft — pending approval
**Version:** 1.0
**Based on:** `docs/prescriptions/prescription-management.md` (approved), `CLAUDE.md` (approved — fixes the `Prescription`/`PrescriptionItem` entity names and the `Draft → Pending → Processing → Sent → Dispensed` / `Cancelled` / `Failed` / `Expired` status lifecycle), `docs/patient-medications/database-spec.md` (approved, precedent)

---

# 1. Overview

This document defines the SQL Server schema needed to persist a Prescription at `Draft` status (Step 18.4 — "Save Draft"), per the approved Phase 1 business specification's section 5.3. No SQL scripts, stored procedures, entity classes, or API design are included here, per scope. Only what Phase 1 actually needs is designed — reaching `Pending`/`Processing`/`Sent`/`Dispensed`, NZePS transmission, and the `Prescription.Worker` are explicitly out of scope (business spec section 4), so this schema does not speculatively add columns those later phases would need but cannot yet specify.

**This task's own field list conflicts with already-approved project architecture. Rather than silently follow the literal wording, §2 documents every reconciliation made and why**, before the table definitions in §3 use the corrected names throughout.

---

# 2. Reconciliation with Approved Architecture (read this first)

1. **There are no `PrescriptionDraft` / `PrescriptionDraftMedication` / `PrescriptionDraftAudit` tables.** `CLAUDE.md`'s domain model already fixes the entity names as `Prescription`, `PrescriptionItem`, and `AuditLog` — "Draft" is a **status value** a `Prescription` can hold, not a separate table. This spec creates `Prescription` (§3.1), `PrescriptionItem` (§3.2), and `PrescriptionAudit` (§3.3 — see item 3 below for why not the generic `AuditLog` name).
2. **The status lifecycle is `Draft, Pending, Processing, Sent, Dispensed, Cancelled, Failed, Expired`, not `Draft, ReadyForReview, Finalized, Sent, Cancelled`.** This isn't just a naming preference: `dbo.PrescriptionStatus` **already exists** in this database (created earlier in the project, part of the original Lookup Management scaffolding) and is **already seeded** with exactly `DRAFT`, `PENDING`, `PROCESSING`, `SENT`, `DISPENSED`, `CANCELLED`, `FAILED`, `EXPIRED` (`database/Scripts/SeedData/LookupSeedData.sql`). `ReadyForReview` and `Finalized` do not exist anywhere in this schema or in `CLAUDE.md`'s approved lifecycle. `Prescription.PrescriptionStatusId` (§3.1) is a foreign key to this **existing, already-approved, already-seeded** table — no new status table or column is created.
3. **No generic `AuditLog` table is created**, despite `CLAUDE.md` naming `AuditLog` as one of the project's core entities. No module in this project has ever actually built a generic, cross-module audit log — every module so far uses either simple `CreatedBy`/`CreatedDate`/`UpdatedBy`/`UpdatedDate` columns, or (for Patient Medication, the one prior module with a first-class "view history" requirement) a **dedicated, per-module** history table, `PatientMedicationHistory`. This spec follows that same established, dedicated-table precedent — `PrescriptionAudit` (§3.3) — rather than inventing a shared table this project has never actually used, matching this project's consistent preference for explicit, per-module structures over premature shared abstractions.
4. **`ProviderId` → `ProviderUserAccountId`, FK → the existing `UserAccount.UserAccountId`** — there is no `User`/`Provider` table; matches every prior module's identical `PrescribedByUserId` → `PrescribedByUserAccountId` reconciliation (`docs/patient-medications/database-spec.md` §2 item 2).
5. **`Selected Medication IDs` (the request field) maps to `PrescriptionItem.PatientMedicationId`** (§3.2) — a nullable FK back to `PatientMedication`, exactly the traceability hook the approved Patient Medication business spec's section 11.3 and this module's own business spec section 11.1 already anticipated.
6. **The XHTML itself is persisted**, not just structured item data. The approved business spec's section 5.3 requires clinical *field* values to be snapshotted, not live-referenced; this spec extends that same reasoning to the whole rendered document (`Prescription.Xhtml`, §3.1) — the point of a snapshot is that a saved prescription must print/display **exactly** as it did at save time, even if `PrescriptionTemplate.xhtml`/`PrescriptionStyle.css` (Step 18.1) are changed by a later release. Re-rendering from structured data on every view would defeat that guarantee.
7. **Every catalog/lookup-derived display value on `PrescriptionItem` is snapshotted as plain text, in addition to keeping its FK.** Storing only `MedicineId`/`DoseUnitId`/etc. would mean a later correction to `Medicine.MedicineName` (Medicine Management) retroactively changes how an already-saved prescription displays if anything ever joins live against it — exactly the failure mode the business spec's snapshot decision (section 5.3) exists to prevent. The FK is kept alongside the snapshot for structured querying/reporting, but is never relied on for display of a saved Prescription.
8. **`RowVersion` is added to `Prescription`, beyond the task's literal list**, matching the "optimistic concurrency from day one" reasoning already applied to every mutable table in this project — `Prescription` will need it the moment Edit Draft (excluded from this step) is built, and retrofitting it later is a real migration; adding it now costs nothing.

---

# 3. Tables

## 3.1 `Prescription` (new)

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `PrescriptionId` | `INT IDENTITY` | No | PK. |
| `PrescriptionNumber` | `NVARCHAR(50)` | No | System-generated, e.g. `RX-000001` — backed by a `SEQUENCE` object (§9, mirrors `Patient_PatientNumberSequence`'s established pattern), formatted by the stored procedure that creates the row. **Deliberately stable/immutable once assigned** — this task's own confirmation-message example (`RX-DRAFT-000001`) embeds the word "DRAFT" in the number itself; not adopted literally, since a status-embedding identifier would have to change when the Prescription later moves to `Pending`/`Sent`/etc., which is a worse design than a plain sequential number that never changes. `UNIQUE`. |
| `DraftPrescriptionId` | `UNIQUEIDENTIFIER` | No | The transient correlation Guid the Preview/Generate step already returns (`GeneratePrescriptionResponse.DraftPrescriptionId`, Step 18). Persisted and made `UNIQUE` (§5) specifically to detect a duplicate Save Draft submission (double-click, retried request) for the *same* generated preview — the task's own "Duplicate draft handling" validation requirement. |
| `PatientId` | `INT` | No | FK → `Patient.PatientId`. |
| `ProviderUserAccountId` | `INT` | No | FK → `UserAccount.UserAccountId` (see §2 item 4) — the prescribing clinician, assumed to be the authenticated caller (business spec §15 item 5). |
| `PrescriptionStatusId` | `INT` | No | FK → **existing** `PrescriptionStatus.PrescriptionStatusId` (see §2 item 2). Always `DRAFT` for a row this step creates. |
| `ClinicalNotes` | `NVARCHAR(MAX)` | Yes | Optional free text, carried over from the Preview/Generate step. |
| `Xhtml` | `NVARCHAR(MAX)` | No | The exact rendered document at save time (see §2 item 6). |
| `IssueDate` | `DATE` | No | Matches the value already shown in Preview (Step 18.2). |
| `ExpiryDate` | `DATE` | Yes | Carried through for future phases; not computed or enforced by this step. |
| `RowVersion` | `ROWVERSION` | No (system-maintained) | **Added beyond the task's literal list** — see §2 item 8. |
| `CreatedDate` | `DATETIME2` | No | |
| `CreatedBy` | `NVARCHAR(100)` | No | |
| `UpdatedDate` | `DATETIME2` | Yes | Unused by this step (nothing here updates a `Prescription` after creation) — included for consistency with every other table's standard audit-column set, and because Edit Draft (a near-future step) will need it immediately. |
| `UpdatedBy` | `NVARCHAR(100)` | Yes | Same reasoning. |
| `IsDeleted` | `BIT` | No, default `0` | Reserved; no delete capability is in scope for this step. |

## 3.2 `PrescriptionItem` (new)

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `PrescriptionItemId` | `INT IDENTITY` | No | PK. |
| `PrescriptionId` | `INT` | No | FK → `Prescription.PrescriptionId`. |
| `PatientMedicationId` | `INT` | Yes | FK → `PatientMedication.PatientMedicationId` (see §2 item 5). `NULL` is structurally allowed for a future medicine added directly from the Medicine Master rather than an existing Patient Medication (`patient-medication-management.md` §11.3) — this step's own workflow always selects from existing Patient Medications, so it will always be populated by *this* step's own writes, but the column must not be `NOT NULL` given that future capability. |
| `MedicineId` | `INT` | No | FK → `Medicine.MedicineId` — structured reference only, never relied on for display (see §2 item 7). |
| `MedicineNameSnapshot` | `NVARCHAR(200)` | No | |
| `GenericNameSnapshot` | `NVARCHAR(200)` | No | |
| `StrengthSnapshot` | `NVARCHAR(50)` | No | |
| `DosageFormSnapshot` | `NVARCHAR(150)` | No | |
| `RouteSnapshot` | `NVARCHAR(150)` | No | |
| `Dose` | `DECIMAL(10,3)` | No | Not a "snapshot" in the FK sense — this is a plain numeric value entered/copied at Create/Resume time on the source `PatientMedication`, never itself a live reference to a mutable catalog row. |
| `DoseUnitId` | `INT` | No | FK → `DoseUnit.DoseUnitId`. |
| `DoseUnitSnapshot` | `NVARCHAR(150)` | No | |
| `FrequencyId` | `INT` | No | FK → `Frequency.FrequencyId`. |
| `FrequencySnapshot` | `NVARCHAR(150)` | No | |
| `Duration` | `INT` | No | |
| `DurationUnitId` | `INT` | No | FK → `DurationUnit.DurationUnitId`. |
| `DurationUnitSnapshot` | `NVARCHAR(150)` | No | |
| `Quantity` | `DECIMAL(10,2)` | No | |
| `Instructions` | `NVARCHAR(500)` | No | |
| `PRN` | `BIT` | No, default `0` | |
| `CreatedDate` | `DATETIME2` | No | |
| `CreatedBy` | `NVARCHAR(100)` | No | |

**No `UpdatedDate`/`UpdatedBy`/`IsDeleted` on this table.** Items are immutable once a `Prescription` is saved (this step never updates or removes one) — a future Edit Draft capability, when built, is expected to replace a Prescription's items wholesale (new rows, old ones logically superseded) rather than mutate an individual snapshot row in place, consistent with the snapshot principle in §2 item 6/7. That is a decision for whichever future step actually implements Edit Draft, not assumed further here.

## 3.3 `PrescriptionAudit` (new)

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `PrescriptionAuditId` | `INT IDENTITY` | No | PK. |
| `PrescriptionId` | `INT` | No | FK → `Prescription.PrescriptionId`. |
| `Action` | `NVARCHAR(50)` | No | `CHECK (Action IN ('CREATED', 'UPDATED'))` — **deliberately not pre-populated with `FINALIZED`/`SENT`/`CANCELLED`/etc.** Only `CREATED` is ever produced by this step; `UPDATED` is included because Edit Draft is clearly the very next capability on this roadmap, not a distant hypothetical. Adding the later lifecycle's action names now, before any step actually implements them, is exactly the kind of speculative design `CLAUDE.md` asks this project to avoid — a future step extends this `CHECK` constraint (a small, safe migration) when it actually needs to. |
| `PreviousValues` | `NVARCHAR(MAX)` | Yes | JSON snapshot, `NULL` for `CREATED`. `CHECK (PreviousValues IS NULL OR ISJSON(PreviousValues) = 1)` — matches `PatientMedicationHistory`'s identical pattern (§2 item 3). |
| `NewValues` | `NVARCHAR(MAX)` | Yes | JSON snapshot. Same `ISJSON` validation. |
| `ChangedBy` | `NVARCHAR(100)` | No | |
| `ChangedDate` | `DATETIME2` | No, default `SYSUTCDATETIME()` | |

## 3.4 `Prescription_PrescriptionNumberSequence` (new — `SEQUENCE`, not a table)

Mirrors `Patient_PatientNumberSequence`'s exact, already-established pattern (`database/Tables/025_CreatePatientNumberSequence.sql`): `AS INT`, `START WITH 1`, `INCREMENT BY 1`, `NO CYCLE`. `NEXT VALUE FOR` is atomic, so two concurrent Save Draft calls can never be issued the same `PrescriptionNumber` — no "read max, add one" race condition. The stored procedure that creates a `Prescription` row formats the raw numeric value (e.g. zero-padded, `RX-` prefix) at insert time.

## 3.5 `Patient`, `Medicine`, `UserAccount`, `PatientMedication`, `DoseUnit`, `Frequency`, `DurationUnit`, `PrescriptionStatus` (existing — unchanged)

No schema changes to any of these. Referenced as-is for their respective foreign keys.

---

# 4. Relationships

- `Patient (1) ──< (many) Prescription` via `PatientId` — `NOT NULL` FK, `NO ACTION`.
- `UserAccount (1) ──< (many) Prescription` via `ProviderUserAccountId` — `NOT NULL` FK, `NO ACTION`.
- `PrescriptionStatus (1) ──< (many) Prescription` via `PrescriptionStatusId` — `NOT NULL` FK, `NO ACTION`.
- `Prescription (1) ──< (many) PrescriptionItem` via `PrescriptionItem.PrescriptionId` — `NOT NULL` FK, `NO ACTION`.
- `PatientMedication (1) ──< (0 or many) PrescriptionItem` via `PatientMedicationId` — nullable FK, `NO ACTION` (see §3.2).
- `Medicine (1) ──< (many) PrescriptionItem` via `MedicineId` — `NOT NULL` FK, `NO ACTION`.
- `DoseUnit (1) ──< (many) PrescriptionItem` via `DoseUnitId`, `Frequency (1) ──< (many) PrescriptionItem` via `FrequencyId`, `DurationUnit (1) ──< (many) PrescriptionItem` via `DurationUnitId` — all `NOT NULL` FK, `NO ACTION`.
- `Prescription (1) ──< (many) PrescriptionAudit` via `PrescriptionAudit.PrescriptionId` — `NOT NULL` FK, `NO ACTION`.

---

# 5. Constraints

- `PK_Prescription` — `PrescriptionId`. `PK_PrescriptionItem` — `PrescriptionItemId`. `PK_PrescriptionAudit` — `PrescriptionAuditId`.
- `UQ_Prescription_PrescriptionNumber` — `UNIQUE (PrescriptionNumber)`.
- `UQ_Prescription_DraftPrescriptionId` — `UNIQUE (DraftPrescriptionId)` — the actual database-level enforcement of "Duplicate draft handling" (task's own Validation requirement): a second Save Draft call carrying the same `DraftPrescriptionId` fails this constraint, translated by the Repository layer to a specific `409`-worthy exception (matching this project's established `TranslateSqlException` pattern), not a generic `500`.
- `CK_Prescription_ExpiryDate` — `CHECK (ExpiryDate IS NULL OR ExpiryDate >= IssueDate)`.
- `CK_PrescriptionAudit_Action` — `CHECK (Action IN ('CREATED', 'UPDATED'))` (see §3.3).
- `CK_PrescriptionAudit_PreviousValuesJson` / `CK_PrescriptionAudit_NewValuesJson` — `ISJSON` validation, matching `PatientMedicationHistory`.
- `FK_Prescription_Patient`, `FK_Prescription_ProviderUserAccount`, `FK_Prescription_PrescriptionStatus`, `FK_PrescriptionItem_Prescription`, `FK_PrescriptionItem_PatientMedication`, `FK_PrescriptionItem_Medicine`, `FK_PrescriptionItem_DoseUnit`, `FK_PrescriptionItem_Frequency`, `FK_PrescriptionItem_DurationUnit`, `FK_PrescriptionAudit_Prescription`.
- Default constraints: `PRN = 0` (`PrescriptionItem`), `IsDeleted = 0` / `CreatedDate = SYSUTCDATETIME()` (`Prescription`), `ChangedDate = SYSUTCDATETIME()` (`PrescriptionAudit`).
- **"At least one medication" (task's own Validation requirement) is not a database `CHECK` constraint.** SQL Server cannot express "this parent row must have at least one child row" as a table-level `CHECK` (it would need to query another table, which `CHECK` constraints cannot do in a way that survives concurrent inserts safely). This is an Application/Service-layer responsibility: the same transaction that inserts the `Prescription` row must insert at least one `PrescriptionItem` row, or roll back entirely — mirrors how `usp_PatientMedication_Create`'s multi-step validation-then-insert pattern already works. Flagged as an assumption, §11 item 1.
- **"Patient exists"/"Provider exists"/"XHTML exists" are standard `NOT NULL` FK / `NOT NULL` column enforcement** (`Prescription.PatientId`, `.ProviderUserAccountId`, `.Xhtml` are all `NOT NULL`) plus the same active-entity-reference validation pattern already established for Patient Medication (`InvalidPatientReferenceException`-style checks belong to the Service layer, not this schema).

---

# 6. Indexes (Performance)

| Index | Column(s) | Purpose |
|---|---|---|
| `UQ_Prescription_PrescriptionNumber` | `PrescriptionNumber` | Uniqueness (§5) + the natural lookup key for "find this prescription by its number." |
| `UQ_Prescription_DraftPrescriptionId` | `DraftPrescriptionId` | Uniqueness (§5) + backs the duplicate-draft check itself. |
| `IX_Prescription_Patient` | `PatientId` | Backs a future "prescriptions for this patient" list — not built by this step, but the natural, predictable next read pattern once `Prescription` rows exist at all. |
| `IX_Prescription_Status` | `PrescriptionStatusId` | Backs the future `Prescription.Worker`'s "find all `Pending`" polling query (`CLAUDE.md`'s already-fixed architecture) — not used by this step, but this is exactly the kind of index that is cheap to add now and expensive to retrofit onto a large table later. |
| `IX_PrescriptionItem_Prescription` | `PrescriptionId` | Backs loading a Prescription's items (every read of a saved Draft). |
| `IX_PrescriptionItem_PatientMedication` | `PatientMedicationId` | Backs a future "which prescriptions included this Patient Medication" traceability query (business spec §11.3-style). |
| `IX_PrescriptionAudit_Prescription` | `PrescriptionId` | Backs loading a Prescription's audit trail. |

---

# 7. Security Considerations

- **Clinical PHI, at least as sensitive as Patient Medication's.** `ClinicalNotes`, `Xhtml` (the full rendered document, including patient/provider identity and every prescribed medicine), and every `*Snapshot` column on `PrescriptionItem` carry patient clinical detail. Standard logging discipline (log `PrescriptionId`/`PatientId` for correlation, never the `Xhtml` column's content or full row) applies with particular emphasis to `Xhtml`, since it is the single largest concentration of PHI this project has persisted so far.
- **`PrescriptionItem` and `PrescriptionAudit` are effectively append-only by this step's design** (no `Update`/`Delete` path is defined for either) — should be enforced at the Application/Repository layer, matching `PatientMedicationHistory`'s identical precedent.
- Role-based restrictions (Administrator/Doctor full access for Save Draft, per the approved business spec §8) are enforced at the Application/API layer, not by this schema.

---

# 8. Consistency Review

- `PatientId`, `MedicineId`, `DoseUnitId`, `FrequencyId`, `DurationUnitId`, `ProviderUserAccountId` (`UserAccount`), and `PrescriptionStatusId` all reuse existing tables exactly as built — no duplicate reference tables.
- Audit columns, soft-delete pattern, and `RowVersion` on `Prescription` all match the conventions established by every prior module.
- No schema change is required to `Patient`, `Medicine`, `UserAccount`, `PatientMedication`, `DoseUnit`, `Frequency`, `DurationUnit`, or `PrescriptionStatus` — this module is fully additive.

---

# 9. Future Compatibility

- **Reaching `Pending`/`Processing`/`Sent`/`Dispensed`** — `Prescription.PrescriptionStatusId` already points at the full, already-seeded lifecycle; a future phase only needs to *update* this column (plus append a `PrescriptionAudit` row for the transition) — no schema change.
- **The `Prescription.Worker`** — `IX_Prescription_Status` (§6) is added now specifically so the Worker's `Pending`-polling query has an index to use from day one, without this phase needing to know anything else about how the Worker will query.
- **NZePS integration** — a known, deliberate gap, not addressed by this schema, matching the identical reasoning already documented in `docs/patient-medications/database-spec.md` §9 for the same class of gap. No external message/reference identifier column exists yet.
- **Edit Draft** — `Prescription.RowVersion`/`UpdatedDate`/`UpdatedBy` and `PrescriptionAudit`'s `UPDATED` action are already in place for it; the item-replacement strategy itself (§3.2) is intentionally left to that future step.

---

# 10. Scalability Confirmation

- `PrescriptionItem`/`PrescriptionAudit` both key off `PrescriptionId` with a dedicated index (§6), so per-prescription reads stay cheap regardless of total table size, matching `PatientMedicationHistory`'s identical reasoning.
- The `*Snapshot` columns on `PrescriptionItem` (§2 item 7) trade a modest amount of storage duplication for guaranteed historical display accuracy without ever needing a join back to `Medicine`/lookup tables for a saved Prescription — a deliberate, bounded cost (a handful of `NVARCHAR` columns per item), not an open-ended one.

---

# 11. Assumptions / Open Items

1. **"At least one medication" is enforced as an atomic Application-layer transaction (insert `Prescription` + at least one `PrescriptionItem`, or roll back both), not a database `CHECK` constraint** — see §5's reasoning. Confirm this is the intended enforcement boundary, matching how equivalent "parent must have children" rules have been handled everywhere else in this project.
2. **`PrescriptionNumber`'s format (`RX-000001`) is this document's own choice**, reconciled away from the task's literal `RX-DRAFT-000001` example for the reasons given in §3.1 — confirm the stable, status-independent numbering approach is wanted before implementation.
3. **`ExpiryDate` is carried as a column but nothing in this phase computes or validates it** beyond the `CHECK (ExpiryDate >= IssueDate)` constraint — left `NULL` by this step's own writes. A future phase should confirm whether/how it should be auto-calculated (e.g. a fixed validity period from `IssueDate`).
4. **`PrescriptionAudit`'s `Action` values are deliberately minimal (`CREATED`, `UPDATED` only)** — see §3.3. Confirm this scoped-to-what's-built-now approach (rather than pre-declaring the full future lifecycle's action names) is acceptable.
5. **Whether `PrescriptionItem`'s snapshot columns should also capture `Manufacturer`** (shown on the rendered document per Step 18.1's template, but not requested as a stored column by this task) is left open — the *document* (`Prescription.Xhtml`) already preserves it verbatim regardless, so this only matters if a future structured (non-XHTML) view of a saved Prescription's items is ever needed.
