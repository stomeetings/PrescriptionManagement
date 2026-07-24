# Medicine Management Specification

**Feature:** Medicine Management
**Status:** Draft
**Version:** 1.0
**Based on:** `docs/medicines/database-spec.md` (approved). Note: this business specification is being written after the database design was already approved, reversing this project's normal Business → Database → SQL → API sequence (`CLAUDE.md`). Written to stay consistent with the already-approved schema rather than re-litigate it; see the Assumptions this produces, called out inline below and in the closing summary.

---

# 1. Overview

The Prescription Management System requires a centralized Medicine Management module that maintains the master catalog of prescribable medicines.

Medicines are master/reference data, maintained independently of any patient. A `Patient` record shall never link directly to a `Medicine` record — any association between a patient and a medicine exists only through a future `Prescription`/`PrescriptionItem`, which is out of scope for this module.

Version 1 provides full lifecycle management of medicine catalog entries (view, search, filter, create, edit, activate, deactivate) so that the future Prescription Management module has a reliable, reusable source of prescribable medicines to reference.

---

# 2. Business Goals

The Medicine Management feature shall:

- Provide a single, centralized catalog of medicines usable by all other modules.
- Prevent duplicate or ambiguous medicine catalog entries.
- Ensure medicine records are never physically removed once they may have been referenced elsewhere, protecting future prescription history.
- Reuse existing Lookup Management data (Dosage Form, Route) rather than duplicating it.
- Establish a stable foundation the future Prescription Management, Dispensing, and Reporting features can depend on without requiring schema or workflow changes.

---

# 3. Scope

Version 1 includes:

- View Medicines
- Search Medicines
- Filter Medicines
- Create Medicine
- Edit Medicine
- View Medicine Details
- Activate Medicine
- Deactivate Medicine

---

# 4. Out of Scope

The following items are not included in Version 1:

- Prescription Management (medicines are referenced by prescriptions in a future module; that linkage itself is not built here)
- Dispensing workflows
- Inventory / stock level tracking
- Pricing / billing
- Drug interaction checking
- Allergy cross-referencing
- Delete Medicine (permanent removal)
- Bulk import/export of medicine data
- Multi-language / localization of medicine names
- Any direct Patient-to-Medicine association

---

# 5. Functional Requirements

## 5.1 View Medicines

Display, per medicine:

- Medicine Code
- Medicine Name
- Generic Name
- Brand Name
- Strength
- Dosage Form
- Route
- Manufacturer
- Controlled Drug indicator
- Status (Active/Inactive)

## 5.2 Search Medicines

Search by:

- Medicine Code
- Medicine Name
- Generic Name
- Brand Name
- Manufacturer

## 5.3 Filter Medicines

Filter by:

- Dosage Form
- Route
- Active Status
- Controlled Drug

## 5.4 Create Medicine

Required fields:

- Medicine Name
- Generic Name
- Strength
- Dosage Form
- Route

Optional fields:

- Brand Name
- Manufacturer
- ATC Code
- Notes

System-generated or assigned at creation:

- Medicine Code (uniqueness enforced regardless of how it is populated — see Assumptions)

## 5.5 Edit Medicine

Administrators may update all editable fields.

Medicine Code cannot be modified once assigned.

## 5.6 View Medicine Details

Display all medicine information, including audit fields (Created By/Date, Updated By/Date).

## 5.7 Activate Medicine

Reactivates a previously deactivated medicine, making it selectable again for future prescriptions.

## 5.8 Deactivate Medicine

Deactivates a medicine so it is no longer selectable for new prescriptions, without removing it or affecting any existing historical reference to it.

---

# 6. Business Rules

- Medicine Code must be unique.
- Medicine Name + Strength + Dosage Form should be unique (one canonical catalog entry per that combination — see database spec §5 and its own flagged assumption about whether Manufacturer/Brand should also factor in).
- Inactive medicines cannot be selected when creating a prescription. This rule is enforced by the future Prescription Management module at the point of prescribing; Medicine Management's own responsibility is limited to exposing an accurate `IsActive` status for that module to check.
- Medicines already referenced by prescriptions cannot be deleted. Since no delete capability exists in this module at all (only Activate/Deactivate), this rule is satisfied by design rather than by an explicit reference check — there is no delete operation for it to guard.
- Use Activate/Deactivate instead of Delete, in all cases, with no exception path.
- Dosage Form and Route must reference existing, active Lookup Management values — an unrecognized or inactive lookup code must be rejected, not silently accepted.
- Deactivated medicines are not physically removed and remain available for historical reference by any future prescription that used them.

---

# 7. Validation Rules

Required:

- Medicine Name
- Generic Name
- Strength
- Dosage Form
- Route

Validation:

- Medicine Code uniqueness
- Medicine Name + Strength + Dosage Form uniqueness
- ATC Code format, when supplied (WHO Anatomical Therapeutic Chemical classification shape — 1 letter, 2 digits, 2 letters, 2 digits)
- Dosage Form and Route must resolve to existing, active Lookup Management values
- Maximum field lengths, per the approved database specification

---

# 8. Authorization

Administrator:

- Full access — View, Search, Filter, Create, Edit, Activate, Deactivate.

Doctor:

- View medicines only.

Pharmacist:

- View medicines only.

Receptionist:

- View medicines only.

This is a narrower write-access model than Patient Management (where Doctors and Receptionists could Create/Edit patients) — here, **only Administrators may modify the medicine catalog**; every other role is read-only. This is an explicit, deliberate difference worth confirming is intended, since it means a Doctor or Pharmacist who identifies an incorrect or missing medicine entry cannot add or correct it themselves and must route the request through an Administrator.

---

# 9. Non-Functional Requirements

The system shall:

- Implement server-side pagination.
- Implement server-side sorting.
- Provide a responsive UI, consistent with the rest of the application's enterprise layout.
- Maintain audit logging (Created By/Date, Updated By/Date) for every medicine record.
- Be performance-optimized for catalogs of thousands of medicines — this scale target is larger than any other module built so far in this project, and should inform the eventual stored-procedure/index design at API-implementation time (the approved database spec already flags that a leading-wildcard `LIKE '%term%'` search pattern would not scale cleanly to this target; that trade-off should be revisited when the API/stored procedures are implemented, not deferred silently).

---

# 10. Audit Requirements

Maintain, on every medicine record:

- Created By
- Created Date
- Updated By
- Updated Date

---

# 11. Acceptance Criteria

The feature shall be considered complete when:

- Administrators can create, edit, view, search, filter, activate, and deactivate medicines.
- Doctors, Pharmacists, and Receptionists can view, search, and filter medicines, with no write access.
- Medicine Code and Medicine Name + Strength + Dosage Form uniqueness are enforced.
- Dosage Form and Route selections are restricted to existing, active Lookup Management values.
- Deactivated medicines remain in the system and are excluded from new-prescription selection without being deleted.
- Documentation has been completed and approved.

---

# 12. Future Integration

## 12.1 Prescription Management

The future Prescription Management module will introduce a `PrescriptionItem` (or equivalent) table with a `MedicineId` foreign key referencing this module's `Medicine` table (per the approved database spec §10). At the point of prescribing:

- Only medicines with `IsActive = true` should be selectable.
- Once a prescription references a medicine, that medicine's record must never be deleted or altered in a way that changes what the historical prescription meant (e.g. Strength/Dosage Form/Route should not be silently repurposed onto the same `MedicineId` — any such correction should be modeled as deactivating the old entry and creating a new one, though the exact rule belongs in the Prescription Management specification, not this one).
- `IsControlledDrug` is expected to drive additional prescribing rules in that future module (e.g. stricter authorization, mandatory reason-for-prescribing capture) — this module only supplies the flag, it does not implement any such rule itself.

## 12.2 Dispensing

A future Dispensing capability (whether part of Prescription Management or its own module) will need to confirm the exact medicine being dispensed against the prescribed `MedicineId` — Medicine Management's Dosage Form/Route/Strength/Brand fields are expected to be the fields a pharmacist cross-checks at the point of dispensing. `IsControlledDrug` is likely to drive extra dispensing-side record-keeping (e.g. controlled-substance register entries), which belongs to that future capability's own specification.

## 12.3 Reporting

Future reporting (e.g. most-prescribed medicines, controlled-drug dispensing volumes, formulary utilization) is expected to join future Prescription/PrescriptionItem data against `Medicine` using the stable `MedicineId`/`MedicineCode`. Because `Medicine` rows are never deleted (only deactivated), historical reports remain reproducible even after a medicine is deactivated or its non-identifying fields (e.g. Manufacturer) are later corrected.

---

# 13. Risks

- **Duplicate catalog entries.** Without careful enforcement of the Medicine Code and Name+Strength+Dosage Form uniqueness rules, the same medicine could be entered more than once, fragmenting future prescription history and reporting.
- **Incorrect Dosage Form/Route selection.** Since these are free-choice lookups rather than medicine-specific constraints (e.g. nothing stops "Paracetamol" from being saved with an implausible route), data-entry errors are possible; mitigated only by Administrator review, not by any structural constraint.
- **Administrator-only write access is a single point of friction.** Every correction or addition, however minor, must go through an Administrator — a risk to data currency if Administrators are not responsive, though this is an explicit, deliberate trade-off (see §8), not an oversight.
- **Controlled-drug misclassification.** An incorrectly set `IsControlledDrug` flag could have regulatory/compliance consequences once the future Prescription/Dispensing modules build workflow rules on top of it — this module's own validation cannot detect a factually wrong classification, only enforce that the flag exists and is a plain boolean.
- **Scale risk.** The explicit "thousands of medicines" performance target is larger than any dataset this project has handled so far; the approved database spec already flags that its search design (leading-wildcard `LIKE`) will not scale ideally to this target — a risk to revisit at implementation time, not resolved by this document.

---

# 14. Dependencies

This feature depends on:

- Lookup Management (Dosage Form, Route — existing, approved)
- Authentication module (role-based authorization)
- Medicine Management Database Design Specification (approved)

Future modules depending on this feature:

- Prescription Management
- Dispensing
- Reporting

---

# 15. Future Enhancements

Future versions may include:

- Inventory / stock level tracking
- Pricing and billing integration
- Drug interaction checking
- Allergy cross-referencing against patient records
- Barcode / GTIN identifiers
- Bulk import from an external formulary data source
- Multi-language medicine names
- Medicine images / packaging references
