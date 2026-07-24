# Medicine Management — Database Design Specification

**Feature:** Medicine Management
**Status:** Draft — pending approval
**Version:** 1.0
**Based on:** `docs/Lookup/database-spec.md` (approved), `docs/patients/database-spec.md` (approved, precedent), `docs/authentication/database-spec.md` (approved, precedent)

---

# 1. Overview

This document defines the SQL Server database design for the Medicine Management module — no SQL scripts, entity classes, repository/service code, or API design are included here, per scope.

`Medicine` is new master/reference data: a catalog of prescribable medicines, not owned by any `Patient` and not yet referenced by any `Prescription`/`PrescriptionItem` table (neither exists yet). It reuses two existing Lookup Management tables — `MedicineForm` and `MedicineRoute` — rather than introducing new ones. Three other existing lookup tables (`DoseUnit`, `Frequency`, `DurationUnit`) are **not** referenced by `Medicine` itself; per the approved Lookup Management design, they exist for the future `PrescriptionItem` table's per-prescription dosing details (a specific prescribed dose/frequency/duration), which is a different concern from a medicine's own catalog identity. This keeps `Medicine` scoped purely to "what can be prescribed," not "how it's being prescribed this time" — the separation the task's own framing ("Medicines are master data... Prescriptions will reference medicines later") calls for.

---

# 2. Design Principles

- **Reuse, don't duplicate.** `MedicineFormId`/`MedicineRouteId` reference the existing `MedicineForm`/`MedicineRoute` tables built for Lookup Management. No second dosage-form or route table is introduced. See Assumptions §11 item 1 for a naming reconciliation this required.
- **Master data, no ownership edges.** `Medicine` has no foreign key to `Patient`, `UserAccount`, or any other domain table — it is pure reference data, matching the task's explicit framing. The only relationships are outbound to the two lookup tables.
- **Forward-compatible with Prescription Management.** `PrescriptionItem` (not yet designed) will hold a `MedicineId` foreign key into this table. Nothing in this design should need to change shape when that FK is added later — see §10 for the explicit compatibility check.
- **Optimistic concurrency from day one.** Following the same reasoning already applied to `Patient` (multiple roles — Administrator, Doctor, Pharmacist — can plausibly edit medicine master data), `RowVersion` is included in the initial design rather than added later. This is a recommendation beyond the task's literal minimum field list — flagged in Assumptions §11 item 4.
- **Soft delete, reserved but unused.** `IsDeleted` exists per the project's standard audit column set, but no `Delete Medicine` procedure is defined — only Activate/Deactivate, matching the stored-procedure list requested and the same precedent set by `Patient`.

---

# 3. Tables

## 3.1 `Medicine` (new)

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `MedicineId` | `INT IDENTITY` | No | PK. |
| `MedicineCode` | `NVARCHAR(20)` | No | Unique. This system's own internal identifier for the medicine record — see Assumptions §11 item 2 for the open question of how it's generated. |
| `MedicineName` | `NVARCHAR(200)` | No | The primary display/common name (e.g. "Paracetamol"). |
| `GenericName` | `NVARCHAR(200)` | No | The INN/generic name. Treated as required — see Assumptions §11 item 3. |
| `BrandName` | `NVARCHAR(200)` | Yes | Commercial brand, where one exists. Many generic entries have none. |
| `Strength` | `NVARCHAR(50)` | No | Free-text strength/concentration (e.g. `"500 mg"`, `"5 mg/mL"`) — kept as text rather than a single numeric column because compound/ratio strengths (e.g. `"500mg/5mL"`) don't fit a plain decimal. See Assumptions §11 item 6 for a structured-strength alternative worth considering. |
| `MedicineFormId` | `INT` | No | FK → `MedicineForm.MedicineFormId` (existing Lookup Management table). Renamed from the task's "DosageFormId" to match the table that actually exists — see Assumptions §11 item 1. |
| `MedicineRouteId` | `INT` | No | FK → `MedicineRoute.MedicineRouteId` (existing Lookup Management table). Renamed from the task's "RouteId" for the same reason. |
| `Manufacturer` | `NVARCHAR(200)` | Yes | Not every catalog entry has a confirmed manufacturer at creation time. |
| `ATCCode` | `NVARCHAR(20)` | Yes | WHO Anatomical Therapeutic Chemical classification code, per task's explicit field list. |
| `IsControlledDrug` | `BIT` | No, default `0` | Flags scheduled/controlled substances (e.g. opioids, benzodiazepines) for future workflow rules (extra authorization, reporting) that Prescription Management may need — this table only carries the flag, it doesn't implement any such rule itself. |
| `IsActive` | `BIT` | No, default `1` | Drives Activate/Deactivate. |
| `Notes` | `NVARCHAR(MAX)` | Yes | Free text. |
| `RowVersion` | `ROWVERSION` | No (system-maintained) | **Recommended, not explicitly requested** — see Design Principles. |
| `CreatedDate` | `DATETIME2` | No | |
| `CreatedBy` | `NVARCHAR(100)` | No | |
| `UpdatedDate` | `DATETIME2` | Yes | |
| `UpdatedBy` | `NVARCHAR(100)` | Yes | |
| `IsDeleted` | `BIT` | No, default `0` | Reserved; no delete capability is in scope. |

## 3.2 `MedicineForm` (existing — unchanged)

No schema changes. Referenced as-is for the `MedicineFormId` foreign key. Current seed values (`TABLET`, `CAPSULE`, `SYRUP`, `INJECTION`, `CREAM`, `DROPS`) may not cover every form needed across 100–200 real medicines — see Assumptions §11 item 5.

## 3.3 `MedicineRoute` (existing — unchanged)

No schema changes. Referenced as-is for the `MedicineRouteId` foreign key. Current seed values (`ORAL`, `IV`, `IM`, `TOPICAL`, `INHALATION`) have the same possible-gap caveat — see Assumptions §11 item 5.

## 3.4 `DoseUnit`, `Frequency`, `DurationUnit` (existing — unchanged, not referenced by `Medicine`)

Already exist and are already seeded from Lookup Management. Listed here only because the task's Seed Data Strategy names them; they belong to the future `PrescriptionItem` table, not to `Medicine` — see §1 and §8.

---

# 4. Relationships

- `MedicineForm (1) ──< (many) Medicine` via `Medicine.MedicineFormId` — `NOT NULL` FK, `NO ACTION` on delete/update, matching the same referential pattern already used for `Patient.GenderId → Gender.GenderId`.
- `MedicineRoute (1) ──< (many) Medicine` via `Medicine.MedicineRouteId` — same pattern.
- No relationship to `Patient`, `UserAccount`, or any prescription table exists or is created here — `CreatedBy`/`UpdatedBy` remain plain audit username strings, not foreign keys, consistent with every other module's audit-column convention.
- **Forward reference (not created by this spec):** the future `PrescriptionItem.MedicineId` will FK into `Medicine.MedicineId`, `NOT NULL`, `NO ACTION` on delete — see §10.

---

# 5. Constraints

- `PK_Medicine` — `MedicineId`.
- `UQ_Medicine_MedicineCode` — unique.
- `UQ_Medicine_Name_Strength_Form` — unique composite on `(MedicineName, Strength, MedicineFormId)`, exactly as requested ("Unique Medicine Name + Strength + DosageForm"). **Deliberately excludes `Manufacturer`/`BrandName`** — this design assumes one canonical catalog row per name+strength+form combination regardless of brand or manufacturer. See Assumptions §11 item 7 if that assumption is wrong (e.g. if two manufacturers' otherwise-identical generics need distinct rows for inventory/costing reasons).
- `FK_Medicine_MedicineForm` — `MedicineFormId → MedicineForm.MedicineFormId`.
- `FK_Medicine_MedicineRoute` — `MedicineRouteId → MedicineRoute.MedicineRouteId`.
- Default constraints: `IsControlledDrug = 0`, `IsActive = 1`, `IsDeleted = 0`, `CreatedDate = SYSUTCDATETIME()`.
- `NOT NULL`: `MedicineCode`, `MedicineName`, `GenericName`, `Strength`, `MedicineFormId`, `MedicineRouteId`, `IsControlledDrug`, `IsActive`, `CreatedDate`, `CreatedBy`, `IsDeleted`.
- Nullable: `BrandName`, `Manufacturer`, `ATCCode`, `Notes`, `UpdatedDate`, `UpdatedBy`.
- **`CHECK` constraint on `ATCCode` format** (new, beyond the task's literal list): `CHECK (ATCCode IS NULL OR ATCCode LIKE '[A-Z][0-9][0-9][A-Z][A-Z][0-9][0-9]')`, matching the WHO ATC classification's fixed 7-character shape (letter, 2 digits, 2 letters, 2 digits — e.g. `N02BE01`). Unlike patient-side identifiers this project has repeatedly left unconstrained (NHI, mobile), ATC is an international, stable, well-documented standard, so a database-level format check is low-risk and genuinely enforceable. Flagged as a recommendation to confirm, not a literal task requirement.

---

# 6. Indexes (Performance)

| Index | Column(s) | Purpose |
|---|---|---|
| `UQ_Medicine_MedicineCode` | `MedicineCode` | Uniqueness + primary lookup (backed automatically by the unique constraint). |
| `UQ_Medicine_Name_Strength_Form` | `MedicineName, Strength, MedicineFormId` | Uniqueness + supports name-first search/sort (backed automatically by the unique constraint). |
| `IX_Medicine_GenericName` | `GenericName` | Search by generic name, requested explicitly. |
| `IX_Medicine_BrandName` | `BrandName` | Search by brand name, requested explicitly. |
| `IX_Medicine_IsActive` | `IsActive` | Filter by status, requested explicitly. |
| `IX_Medicine_MedicineFormId` | `MedicineFormId` | Supports the FK join and Filter-by-Form. |
| `IX_Medicine_MedicineRouteId` | `MedicineRouteId` | Supports the FK join and Filter-by-Route. |

**Note on search (same caveat already documented for `Patient`/`UserAccount`):** if Search implements `LIKE '%term%'` (contains) rather than prefix matching, these indexes won't fully prevent a scan regardless of which columns they cover — flagged here for awareness ahead of the API/stored-procedure design, not resolved by this document.

---

# 7. Stored Procedures (purpose only — no SQL yet)

| Procedure | Purpose |
|---|---|
| `usp_Medicine_GetAll` | Paginated, unfiltered list — backs the default View Medicines screen. |
| `usp_Medicine_GetById` | Full detail for one medicine — View Details and the Edit form. |
| `usp_Medicine_Create` | Inserts a new medicine. Whether `MedicineCode` is generated here or supplied by the caller depends on Assumptions §11 item 2. |
| `usp_Medicine_Update` | Updates editable fields. `MedicineCode` should not be accepted as an input once created, matching `Patient`'s immutable-identifier precedent (pending confirmation per item 2). |
| `usp_Medicine_Activate` | Sets `IsActive = 1`. |
| `usp_Medicine_Deactivate` | Sets `IsActive = 0`. Does not check for existing Prescription references — that belongs to the future Prescription module's own business rules (see §10), not this procedure. |
| `usp_Medicine_Search` | Paginated, filtered list — search term matched against `MedicineCode`/`MedicineName`/`GenericName`/`BrandName` (the four columns the task's index list itself implies are search-relevant), plus filters on `MedicineFormId`, `MedicineRouteId`, `IsActive`, and possibly `IsControlledDrug`. Exact filter set to be confirmed at API-spec time. |

No dedicated "check MedicineCode/Name+Strength+Form exists" procedures — following `Patient`'s precedent, uniqueness is enforced by the constraints themselves, with `Create`/`Update` catching the constraint violation and translating it at the Service layer.

---

# 8. Seed Data Strategy

**Lookup categories** — all five named in the task already exist and are already seeded via Lookup Management's original seed script (`database/Scripts/SeedData/LookupSeedData.sql`); nothing new is required for `DoseUnit`, `Frequency`, or `DurationUnit` since `Medicine` doesn't reference them. `MedicineForm` and `MedicineRoute`, however, may need a small number of **additional** seed values appended (not replacing existing ones) before 100–200 real medicines can be seeded — see Assumptions §11 item 5. Any such addition is itself a small, idempotent `MERGE`-based script following the existing `LookupSeedData.sql` pattern, not a redesign.

**Medicine seed data** — recommend 100–200 rows, following the same `MERGE ... WHEN NOT MATCHED BY TARGET` idempotency pattern established by `PatientSeedData.sql`, keyed on `MedicineCode` (or, if `MedicineCode` turns out to be server-generated per item 2, keyed on the `(MedicineName, Strength, MedicineFormId)` triple instead — the same triple already enforced as unique).

Recommended composition, drawing from common/well-known therapeutic categories (similar in spirit to a WHO Essential Medicines List selection — public, non-personal reference data, so none of the privacy considerations that applied to `PatientSeedData.sql`'s fictional NHI numbers apply here):

- **Analgesics/Antipyretics:** Paracetamol 500 mg Tablet, Ibuprofen 200 mg Tablet, Aspirin 300 mg Tablet.
- **Antibiotics:** Amoxicillin 500 mg Capsule, Doxycycline 100 mg Capsule, Azithromycin 250 mg Tablet.
- **Cardiovascular:** Amlodipine 5 mg Tablet, Atorvastatin 20 mg Tablet, Losartan 50 mg Tablet.
- **Diabetes:** Metformin 500 mg Tablet, Gliclazide 80 mg Tablet.
- **Gastrointestinal:** Omeprazole 20 mg Capsule, Ranitidine 150 mg Tablet.
- **Respiratory:** Salbutamol 100mcg Inhaler *(note: "Inhaler" is not in `MedicineForm`'s current seed list — see item 5)*, Cetirizine 10 mg Tablet.
- **Mental health/controlled:** Diazepam 5 mg Tablet, Codeine 30 mg Tablet — both good candidates for `IsControlledDrug = 1`, to ensure seed data actually exercises that flag rather than leaving it untested.
- Remaining rows filled out across these same categories (additional strengths, additional common generics) to reach the 100–200 target.

Each seeded row should get a plausible `ATCCode` (real WHO codes exist for all the examples above) so the new `CHECK` constraint (§5) is exercised by seed data, not just left untested until real usage.

---

# 9. Security Considerations

- **No PII.** Unlike `Patient`, `Medicine` contains no personally identifiable information — it is reference data. Standard audit logging discipline still applies (don't log full row contents unnecessarily), but there is no PHI-level sensitivity to design around.
- **Data integrity:** `NOT NULL`/`UNIQUE`/FK constraints enforce required fields and valid `MedicineFormId`/`MedicineRouteId` values at the database level, not only in application-layer validation.
- **Controlled-drug flag:** `IsControlledDrug` is a plain data flag only — this schema does not implement any access-control or extra-authorization behavior around it. Any such rule belongs to the future Prescription Management business logic, not to this table.

---

# 10. Compatibility with Future Prescription Management

- **Confirmed additive-only.** Nothing in this design requires a shape change to support a future `PrescriptionItem.MedicineId INT NOT NULL FOREIGN KEY REFERENCES Medicine(MedicineId)` — the same `NO ACTION` on delete/update pattern already used throughout this project.
- **Deactivation doesn't break history.** Matching `Gender`/`MedicineForm`/`MedicineRoute`'s existing precedent, deactivating a `Medicine` (`IsActive = 0`) never removes the row, so historical `PrescriptionItem` rows referencing it continue to resolve correctly — only new prescriptions would need an Application-layer rule (in the future Prescription module) preventing selection of an inactive medicine.
- **Dosing detail stays out of `Medicine`.** `DoseUnit`/`Frequency`/`DurationUnit` are confirmed to belong on the future `PrescriptionItem` table (a specific prescribed dose/frequency/duration), not on `Medicine` (the catalog entry) — keeping "what it is" separate from "how it's being prescribed this time," per the task's own stated goal.
- **`IsControlledDrug` is ready for future business rules** (e.g. mandatory Doctor-only prescribing, extra audit logging) without any schema change — the flag already exists on the row a future rule would need to inspect.

---

# 11. Assumptions / Open Items

1. **Field naming reconciled to existing tables.** The task's field list names `DosageFormId`/`RouteId`, but the existing Lookup Management tables (already built, already seeded) are `MedicineForm`/`MedicineFormId` and `MedicineRoute`/`MedicineRouteId`. This design uses `Medicine.MedicineFormId`/`Medicine.MedicineRouteId` to reuse those tables exactly as they exist, per the explicit "do not create duplicate lookup tables" instruction. Confirm this reconciliation is the intended reading before implementation.
2. **`MedicineCode` generation mechanism is not specified.** Two reasonable options: (a) server-generated via a `SEQUENCE`, mirroring `Patient.PatientNumber`'s exact precedent; (b) manually entered by an Administrator/Pharmacist at creation time (e.g. matching an external formulary/NHS dm+d-style code). This document assumes nothing yet — needs a decision before `usp_Medicine_Create`'s parameter list can be finalized.
3. **`GenericName` treated as required (`NOT NULL`).** The task's field list doesn't mark it nullable (only `ATCCode` is explicitly marked nullable), and a generic name is core identifying data for a formulary entry — but confirm this reading is correct, since making it optional later would be a straightforward relaxation, while tightening a nullable column to `NOT NULL` after real data exists is more disruptive.
4. **`RowVersion` was added beyond the task's literal minimum field list**, matching `Patient`'s "include optimistic concurrency from day one" reasoning (multiple roles can plausibly edit medicine master data concurrently). Confirm this is wanted, or it can be dropped without affecting anything else in this design.
5. **`MedicineForm`/`MedicineRoute` seed data may need additions before 100–200 real medicines can be seeded.** Current seed values only cover `TABLET, CAPSULE, SYRUP, INJECTION, CREAM, DROPS` (forms) and `ORAL, IV, IM, TOPICAL, INHALATION` (routes) — common real-world entries like Inhaler, Patch, Suppository, or Sublingual/Rectal/Ophthalmic/Nasal routes have no matching lookup value yet. This is a small, additive gap (append new rows via the existing `MERGE` pattern), not a redesign, but should be resolved before Medicine seed data implementation, not discovered partway through it.
6. **`Strength` is a single free-text column**, not a structured `StrengthValue` (numeric) + `StrengthUnit` (FK to the existing `DoseUnit` table) pair. Free text handles compound strengths (e.g. `"500mg/5mL"`) more simply, but a structured pair would let future features (dose-range validation, unit-aware sorting) reason about strength numerically. Flagged as worth confirming now, since splitting this column later — after real medicine data and possibly early Prescription references exist — is more disruptive than deciding it up front.
7. **The composite uniqueness rule assumes one canonical row per `(MedicineName, Strength, MedicineFormId)`, regardless of `Manufacturer`/`BrandName`.** If the real requirement is "one row per manufacturer's version of a generic," the unique constraint would need `Manufacturer` or `BrandName` added to it — a materially different design. Confirm before implementation.
8. **Search-matching semantics** (exact/prefix/contains) are unspecified here, same recurring open question as `Patient`'s and `UserAccount`'s equivalent specs — left for the API-spec stage.
