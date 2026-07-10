# Lookup Management — Database Design Specification

**Feature:** Lookup Management
**Status:** Draft — pending approval
**Version:** 1.1 — revised to use dedicated per-category tables (architecture decision, supersedes v1.0's generic model)
**Based on:** `docs/Lookup/Lookup-management.md` (Business Specification, approved)

---

# 1. Database Design Overview

This document defines the SQL Server schema required to satisfy the approved Lookup Management Business Specification. It covers structure only — no T-SQL scripts, no stored procedures, no ORM entities.

**Revision note:** v1.0 of this document proposed a generic `LookupCategory`/`LookupValue` model. Per an explicit architecture decision, that approach has been rejected in favor of **one dedicated table per lookup category**. This revision replaces that design throughout. See §14 for the resulting trade-offs, including a direct conflict this creates with the approved business specification that should be resolved.

---

# 2. Design Decisions

**Decision 1 — One dedicated table per lookup category, not a shared generic table.**
Per explicit direction, each category listed in business spec §7 gets its own table: `Gender`, `PrescriptionStatus`, `MedicineForm`, `MedicineRoute`, `DoseUnit`, `Frequency`, `DurationUnit`, `ProfileType`.

This reverses the v1.0 recommendation. It is flagged here rather than silently adopted because business spec §6 explicitly states *"the Lookup Management feature shall use a generic lookup model"* and *"support adding new lookup categories in the future without requiring redesign."* Dedicated per-category tables mean adding a new category (e.g. Prescription Item Status, once its lifecycle is defined) requires a new table, new constraints, and new stored procedures — a schema change, not a data change. **This is a direct conflict with an approved business requirement, not just a stylistic choice**, and the business specification should be amended to reflect this decision so the two documents don't silently disagree. This spec proceeds on the assumption that the architecture decision you provided is the intended override.

**Decision 2 — Real benefit gained in exchange: strong, statically-typed relationships.**
Under the rejected generic model, a foreign key from e.g. `Prescription.StatusId` would point at a shared `LookupValue` table containing values from every category, relying entirely on application code to filter by the correct category — a real risk (noted in v1.0 as "cross-category leakage"). With dedicated tables, `Prescription.PrescriptionStatusId` can foreign-key directly to `PrescriptionStatus.PrescriptionStatusId`. It becomes structurally impossible for a Prescription to reference a `MedicineForm` value by mistake — the database itself enforces category correctness, not just application logic. This is the strongest justification for the decision and is worth stating plainly.

**Decision 3 — A single, uniform column template applied to every table.**
Even though the tables are separate, they are not independently designed — all eight share an identical column shape (`Code`, `DisplayText`, `DisplayOrder`, `IsActive`, audit columns). This preserves most of the practical benefit of "genericness" at the repository/service code level (a single generic Dapper repository pattern can still operate against any of these tables by name), while giving up genericness only at the schema level. New categories are mechanical to add — copy the template, rename it — even though they do require a migration.

**Decision 4 — Naming: PascalCase, singular, matching business spec category names.**
Per `CLAUDE.md` table-naming conventions: `Gender`, `PrescriptionStatus`, `MedicineForm`, `MedicineRoute`, `DoseUnit`, `Frequency`, `DurationUnit`, `ProfileType` — spaces removed from the business spec's category names (e.g. "Prescription Status" → `PrescriptionStatus`), consistent with how the rest of the project's naming standard collapses multi-word business terms into PascalCase identifiers.

**Decision 5 — `Code` separated from `DisplayText`.**
Unchanged from v1.0's reasoning: application logic must reference a stable identifier (`Code`) that doesn't change even if the label shown in the UI (`DisplayText`) is edited later. Still required per business rule §8 ("unique business code" + "user-friendly display name").

**Decision 6 — `DisplayOrder` on every table.**
Required by business rule §8 ("lookup values shall support display ordering"), now a per-table column since there is no longer a shared value table to hold it centrally.

**Decision 7 — Soft delete only; no hard delete path.**
Unchanged reasoning from v1.0: business rule §8 requires values are "not permanently removed in Version 1" and historical records must keep referencing deactivated values. `IsActive` / `IsDeleted` remain the only deactivation mechanism, on every table.

**Decision 8 — Full audit columns included now, despite V1 being read-only.**
Unchanged reasoning: the business spec's own Future Enhancements (§16) already commits to CRUD/admin later; adding audit columns to eight already-live tables later would be eight breaking migrations instead of one design decision now.

**Decision 9 — No `RowVersion` in V1.**
Unchanged reasoning: there is no write path yet, so there is nothing for optimistic concurrency to protect. Deferred to Future Considerations for when the admin write path is designed — now needed on eight tables instead of two.

**Decision 10 — Default `dbo` schema, not a dedicated schema per category or a shared `lookup` schema.**
Unchanged reasoning from v1.0 (no project-wide schema-namespace convention exists yet), though the case for revisiting this has gotten slightly stronger now that there are eight structurally-related tables that a `lookup.*` schema could group and namespace together. Still deferred rather than decided unilaterally here (see Future Considerations).

**Decision 11 — Surrogate integer primary keys per table (`<TableName>Id`).**
Unchanged reasoning: insulates foreign keys from a future correction to a `Code` value. Naming follows the `<TableName>Id` convention (e.g. `GenderId`, `PrescriptionStatusId`), per `sql-server-designer.md`.

**Decision 12 — Unique constraint on `Code` simplifies from composite to single-column.**
Under the rejected generic model, `Code` uniqueness had to be scoped to `(LookupCategoryId, Code)` because one shared table held every category's values. With dedicated tables, each table *is* a category, so uniqueness only needs to be `UNIQUE(Code)` — a simplification that falls out naturally from the new design, not an added decision.

---

# 3. Table Definitions

Eight independent tables, one per lookup category defined in business spec §7:

| Table | Business Category |
|---|---|
| `Gender` | Gender |
| `PrescriptionStatus` | Prescription Status |
| `MedicineForm` | Medicine Form |
| `MedicineRoute` | Medicine Route |
| `DoseUnit` | Dose Unit |
| `Frequency` | Frequency |
| `DurationUnit` | Duration Unit |
| `ProfileType` | Profile Type |

Prescription Item Status is not included — per the business spec's own note, it remains excluded until its lifecycle is defined in the Prescription module (at which point it follows the same table template as a ninth table).

All eight tables share the identical column structure defined once in §4 rather than being described eight times.

---

# 4. Column Definitions

Applies uniformly to all eight tables (`Gender`, `PrescriptionStatus`, `MedicineForm`, `MedicineRoute`, `DoseUnit`, `Frequency`, `DurationUnit`, `ProfileType`):

| Column | Type | Nullable | Description |
|---|---|---|---|
| `<TableName>Id` | `INT IDENTITY` | No | Surrogate primary key, e.g. `GenderId`, `PrescriptionStatusId`. |
| `Code` | `NVARCHAR(50)` | No | Stable business key referenced by application logic (e.g. `MALE`, `DISPENSED`, `TABLET`). |
| `DisplayText` | `NVARCHAR(150)` | No | Human-readable label shown in dropdowns/UI. |
| `DisplayOrder` | `INT` | No | Ordering within the table (e.g. Frequency values in clinical order, not alphabetical). |
| `IsActive` | `BIT` | No | Whether the value is currently selectable. Default `1`. |
| `CreatedDate` | `DATETIME2` | No | Audit column (UTC). |
| `CreatedBy` | `NVARCHAR(100)` | No | Audit column. |
| `UpdatedDate` | `DATETIME2` | Yes | Audit column. |
| `UpdatedBy` | `NVARCHAR(100)` | Yes | Audit column. |
| `IsDeleted` | `BIT` | No | Soft-delete flag. Default `0`. Never physically deleted (Decision 7). |

No table carries category-specific columns in this version — all eight are structurally identical. Should a future need arise (e.g. `Frequency` needing a numeric `TimesPerDay` for dosage calculations), the dedicated-table approach means that column can be added to `Frequency` alone without affecting the other seven — one advantage of this design over the rejected shared-table model.

---

# 5. Primary Keys

- `Gender.GenderId`
- `PrescriptionStatus.PrescriptionStatusId`
- `MedicineForm.MedicineFormId`
- `MedicineRoute.MedicineRouteId`
- `DoseUnit.DoseUnitId`
- `Frequency.FrequencyId`
- `DurationUnit.DurationUnitId`
- `ProfileType.ProfileTypeId`

All surrogate `INT IDENTITY` keys (Decision 11), following the `<TableName>Id` convention.

---

# 6. Foreign Keys

None exist **within** the Lookup Management module — with dedicated tables there is no parent/child relationship left to enforce internally (this replaces v1.0's single `LookupValue → LookupCategory` foreign key, which no longer applies).

Future modules will foreign-key directly into the specific table they need, e.g.:
- `Patient.GenderId` → `Gender.GenderId`
- `Prescription.PrescriptionStatusId` → `PrescriptionStatus.PrescriptionStatusId`
- `Medicine.MedicineFormId` → `MedicineForm.MedicineFormId`
- `Medicine.MedicineRouteId` → `MedicineRoute.MedicineRouteId`
- `PrescriptionItem.DoseUnitId` → `DoseUnit.DoseUnitId`
- `PrescriptionItem.FrequencyId` → `Frequency.FrequencyId`
- `PrescriptionItem.DurationUnitId` → `DurationUnit.DurationUnitId`
- `Profile.ProfileTypeId` → `ProfileType.ProfileTypeId`

Each relationship is now strongly typed to its specific table (Decision 2) rather than a generic reference — designing these domain tables themselves is out of scope for this spec.

---

# 7. Constraints

- `NOT NULL` on `Code`, `DisplayText`, `DisplayOrder`, `IsActive`, `CreatedDate`, `CreatedBy` — on every table.
- Default constraints: `IsActive` = `1`, `IsDeleted` = `0`, `CreatedDate` = current UTC timestamp (UTC keeps audit timestamps consistent across environments regardless of server timezone, per business spec §12's environment-consistency requirement).
- No `CHECK` constraint on `Code` format, on any table. Code shapes still vary by category's nature (`MALE` vs. `TABLET` vs. `ONCE_DAILY`), and enforcing a single pattern would be either too loose or too strict. Format validation remains an Application-layer concern, not a database one.

---

# 8. Unique Constraints

- `UNIQUE(Code)` on each of the eight tables individually (Decision 12). Simpler than the composite constraint the generic model would have required, because each table now only ever holds one category's values by construction.

---

# 9. Index Recommendations

- The unique constraint on `Code` (§8) is implemented by SQL Server as a unique non-clustered index and is sufficient for category-code lookups on each table.
- No further secondary indexes are recommended. Each table is expected to hold single-digit to low-double-digit rows (per the value lists in business spec §7); a clustered index scan of the primary key is trivial at this scale for both "get all values for this category" and "get all lookup data across categories" (the latter now means querying up to eight small tables, still cheap). Adding indexes for ordering (`DisplayOrder`) or filtering (`IsActive`) is unnecessary at these row counts and would only add write overhead — this can be revisited if any of these tables unexpectedly grows well beyond reference-data scale, which is not anticipated.

---

# 10. Audit Columns

`CreatedDate`, `CreatedBy`, `UpdatedDate`, `UpdatedBy`, `IsDeleted` on all eight tables, plus `IsActive` for business-level deactivation — same set and same rationale as v1.0 (Decision 8), just applied eight times instead of once. `RowVersion` remains excluded from V1 on all eight tables (Decision 9).

---

# 11. Seed Data Strategy

- One seed script per table, each populating the exact values enumerated in business spec §7 for that category (e.g. `Gender`: `Male`, `Female`, `Other`; `PrescriptionStatus`: `Draft, Pending, Processing, Sent, Dispensed, Cancelled, Failed, Expired`, matching the documented prescription lifecycle verbatim).
- Delivered as plain, idempotent SQL scripts under `database/SeedData/` (per `CLAUDE.md`), safely re-runnable (existence checks or `MERGE`) so re-deploying an environment doesn't duplicate rows.
- The same eight seed scripts run unmodified in every environment (Dev/Test/Prod), per business spec §12.
- `PrescriptionStatus` codes in particular must match the state-machine constants a future Prescription module will hardcode — this dependency is unchanged from v1.0, only the table it lives in has changed (see §14 for how the associated risk has shifted, not disappeared).

---

# 12. Entity Relationship Explanation

There are **no relationships between the eight lookup tables themselves** — each is an independent, structurally identical reference table (this replaces v1.0's one-to-many `LookupCategory` → `LookupValue` relationship, which no longer exists under this design).

The relationships that matter are all **outbound**, from future domain tables into these eight tables (see §6). Each is a simple many-to-one relationship (e.g. many `Prescription` rows reference one `PrescriptionStatus` row), each strongly typed to the specific lookup table rather than routed through a shared intermediary.

---

# 13. Migration Strategy

- Plain, version-controlled SQL scripts — no EF Core migrations, per `CLAUDE.md`.
- One creation script and one seed script per table, e.g.:
  - `001_CreateGender.sql`, `002_SeedGender.sql`
  - `003_CreatePrescriptionStatus.sql`, `004_SeedPrescriptionStatus.sql`
  - `005_CreateMedicineForm.sql`, `006_SeedMedicineForm.sql`
  - ...continuing through `DoseUnit`, `Frequency`, `DurationUnit`, `ProfileType`.
- As the first module through the pipeline, this establishes the numbering convention subsequent modules should follow.
- Adding a future category (e.g. Prescription Item Status) means adding the next pair of scripts using the same template (Decision 3) — mechanical, but still a schema migration, unlike the generic model where it would have been a data-only change. This cost is the direct trade-off of Decision 1 and should be weighed each time a new category is proposed.

---

# 14. Risks

- **Direct conflict with business spec §6.** The approved business specification states the feature "shall use a generic lookup model." This design deliberately does not. This is the most important item in this document — the business specification should be updated to reflect this architecture decision (or an explicit documented exception recorded in it), so the two specs don't quietly disagree about what was actually approved. Recommend resolving this before SQL implementation begins.
- **Higher cost per new category.** Every future lookup category requires a new table, constraints, index, and later CRUD stored procedures — directly working against business spec §2's goal of introducing categories "without requiring application redesign." Accepted as a conscious trade-off for Decision 2's stronger typing, but should be re-weighed if new categories are expected frequently.
- **Prescription Status synchronization risk persists, in a different form.** The risk noted in v1.0 (values must stay synchronized with the future Prescription module's hardcoded state machine) is unchanged in kind — it now lives on the dedicated `PrescriptionStatus` table instead of a shared one. What *has* been eliminated is the "wrong category leaked in" risk, since `PrescriptionStatus` can no longer structurally contain a `MedicineForm` value.
- **Schema surface area.** Eight tables (soon possibly nine, with Prescription Item Status) to migrate, permission, and maintain, versus two under the rejected model — more objects, more scripts, more stored procedures once the write path is built.
- **Seed data divergence**, unchanged from v1.0: seed scripts must be identical across environments, never hand-edited per environment (business spec §12).

---

# 15. Future Considerations

- Add `RowVersion` to each of the eight tables when the admin CRUD/write path (business spec §16) is designed.
- Localization (business spec §4 excludes it from V1; §9 requires the design not preclude it later): would now imply a separate translation table per lookup table (e.g. `GenderTranslation`, `PrescriptionStatusTranslation`) rather than one shared translation table — another multiplied cost of the dedicated-table approach, flagged as a placeholder only.
- Prescription Item Status becomes a ninth dedicated table, following the identical template in §4, once its business lifecycle is defined in the future Prescription module.
- Revisit whether a dedicated `lookup` SQL schema should group these eight (soon nine) tables together, now that there's a concrete, growing set of structurally related tables to namespace (Decision 10).
- If new categories turn out to be added frequently in practice, revisit whether Decision 1 should be reconsidered for future categories only (leaving existing dedicated tables as-is) — noted here only as a possibility, not a recommendation.
