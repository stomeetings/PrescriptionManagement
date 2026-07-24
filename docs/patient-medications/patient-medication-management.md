# Patient Medication Management Specification

**Feature:** Patient Medication Management
**Status:** Draft
**Version:** 1.0

---

# 1. Overview

The Prescription Management System requires a Patient Medication Management module that maintains each patient's **current medication list** — the set of medicines a patient is actively taking (or has taken, once stopped), independent of any single prescribing event.

A Patient Medication is **not** a prescription. It represents an entry on a patient's medication list — the clinical record of "this patient takes this medicine, at this dose, for this reason" — analogous to a medication reconciliation list a clinician maintains over time. A Prescription (future module) is the act of formally prescribing; a Patient Medication may later be *selected* when creating a Prescription, or a Prescription may introduce a new Patient Medication, but the two are distinct concepts with a many-to-many-over-time relationship, not a one-to-one one.

A patient may have zero or many current medications. Each Patient Medication references exactly one Medicine from the Medicine Master (Medicine Management).

---

# 2. Business Goals

The Patient Medication Management feature shall:

- Maintain an accurate, current, and historical record of every medicine a patient is taking or has taken.
- Prevent duplicate active entries for the same medicine and strength on a single patient.
- Preserve a complete, immutable history of stopped medications for clinical and audit purposes.
- Provide the foundation the future Prescription Management module needs to let a clinician select existing patient medications (in addition to choosing new medicines from the Medicine Master) when creating a prescription.
- Reuse Patient Management and Medicine Management as the sources of truth for patient and medicine identity — this module does not duplicate either.

---

# 3. Scope

Version 1 includes:

- View Patient Medication List
- Search Patient Medications
- Filter Patient Medications
- Add Medication
- Edit Medication
- View Medication Details
- Stop Medication
- Resume Medication
- View Medication History

---

# 4. Out of Scope

The following items are not included in Version 1:

- Prescription Management itself (creating, printing, or dispensing a prescription — a separate future module that *consumes* this one, per section 11)
- Dispensing workflows
- Drug interaction / allergy checking against a patient's medication list
- Medication reconciliation workflows beyond the single-patient list maintained here (e.g. cross-facility reconciliation, imported external medication lists)
- Refill reminders / adherence tracking
- Deleting a Patient Medication record (only Stop/Resume — see section 6)

---

# 5. Functional Requirements

## 5.1 View Patient Medication List

Displays a patient's **current** medication list — Active entries by default (see section 5.9 for the distinction from Medication History).

Display, per entry:

- Medicine Name
- Generic Name
- Strength
- Dosage Form
- Route
- Dose
- Dose Unit
- Frequency
- Duration
- Duration Unit
- Quantity
- PRN indicator
- Start Date
- End Date (if set)
- Status (Active/Stopped)

## 5.2 Search Patient Medications

Search by:

- Patient Name
- Medicine Name
- Generic Name

**This implies two access patterns**, not one: a per-patient view (reached from within an existing Patient's own record, where searching by Patient Name would be redundant) and a cross-patient view (e.g. "find every patient currently on Metformin"), where Patient Name search is the primary way to locate a specific patient's list. Both are in scope; see Assumptions section 15 item 1.

## 5.3 Filter Patient Medications

Filter by:

- Active / Inactive (Inactive meaning **Stopped** — see section 6 for why this module does not use a generic "delete" or "inactive" concept the way Patient/Medicine Management do)
- PRN (Yes/No)
- Start Date (range)
- End Date (range)

## 5.4 Add Medication

Allows searching the Medicine Master (Medicine Management) to select a Medicine. Only **active** medicines are selectable (business rule, section 6).

When a medicine is selected, the following are automatically populated from the Medicine Master and are **not** independently re-entered:

- Medicine Name
- Generic Name
- Strength
- Dosage Form
- Route

The user then enters:

Required:

- Dose
- Dose Unit
- Frequency
- Duration
- Duration Unit
- Quantity
- Instructions
- PRN (Yes/No)
- Start Date

Optional:

- End Date
- Clinical Notes

**Terminology clarified for this spec** (these three are easy to conflate): **Dose** is the amount taken per administration (e.g. "500 mg"); **Frequency** is how often it's taken (e.g. "Twice Daily"); **Quantity** is the total amount supplied/dispensed for this course (e.g. "60 tablets"). **Duration**/**Duration Unit** describe how long the course runs (e.g. "7 Days"), which is a planning/expectation field, not the same thing as the optional **End Date** (an actual or intended stop date) — a course could specify a 7-day duration without an explicit End Date being set, and vice versa.

## 5.5 Edit Medication

Applies **only to Active medications** — once a medication is Stopped, it becomes read-only (section 6) and Edit is not available for it; correcting a stopped record is out of scope for V1 (see section 4).

Administrators and Doctors may update all editable fields (Dose, Dose Unit, Frequency, Duration, Duration Unit, Quantity, Instructions, PRN, Start Date, End Date, Clinical Notes). The selected Medicine itself is not editable after creation — changing the medicine is a new medication, not an edit to an existing one (mirrors Patient Management's "Patient Number cannot be modified" / Medicine Management's "Medicine Code cannot be modified" precedent, applied here to the Medicine reference rather than to a business identifier).

## 5.6 View Medication Details

Displays full detail for one Patient Medication entry: every field from section 5.1 plus Clinical Notes, and audit information (section 9).

## 5.7 Stop Medication

Marks an Active medication as Stopped. Once stopped:

- The record becomes read-only (no further edits).
- It no longer counts toward the "duplicate active medication" check (section 6), freeing that Medicine+Strength combination to be added again later (via Add Medication or Resume).
- It remains permanently visible in Medication History (section 5.9).

## 5.8 Resume Medication

**This task explicitly requires documenting the chosen approach; this spec resolves it as follows: Resume creates a new Patient Medication record — it does not reactivate the stopped record in place.**

Reasoning:
- Section 6 requires "Stopped medications become read-only." If Resume simply flipped a stopped record's status back to Active, that record would no longer be immutable — directly contradicting the read-only rule. Creating a new record instead means the original Stopped entry remains permanently frozen exactly as it was when stopped.
- This keeps Medication History (section 5.9) a clean, append-only timeline: every Stop/Resume cycle for a given medicine produces a distinct, individually-dated record, rather than one record whose history has to be reconstructed from a separate transition log.
- It matches the same non-destructive philosophy already established in Patient Management and Medicine Management (Activate/Deactivate never mutates history) — here extended one step further, since a "reactivated" medication genuinely is a new course clinically (new Start Date, potentially adjusted Dose/Frequency/Quantity), not literally the continuation of the old one.

Resume, in this design: pre-populates a new medication entry from the stopped record's Medicine/Strength/Dosage Form/Route/Dose/Dose Unit/Frequency/Duration/Duration Unit/Instructions/PRN as editable defaults, requires a new Start Date (defaulting to the resume date), and creates a new Active record. The new record should reference which prior (stopped) record it resumed from, for traceability — see Assumptions section 15 item 6 for how that link should be modeled (a Database Specification concern, not decided here).

## 5.9 View Medication History

Displays the **complete** timeline of Patient Medication records for a patient — both Active and every Stopped entry, in chronological order — distinct from section 5.1's list, which shows only the current (Active) set by default. This is where multiple Stop/Resume cycles for the same medicine become visible as separate, linked entries.

---

# 6. Business Rules

- Only active patients can receive medications — Add Medication is blocked if the patient's `IsActive` status (Patient Management) is false.
- Only active medicines can be selected — Add Medication's Medicine Master search only offers medicines with `IsActive = true` (Medicine Management).
- A patient cannot have duplicate **active** medications with the same Medicine + Strength. This check only ever considers *Active* entries — a Stopped entry for the same Medicine + Strength does not block a new Add or Resume. (Whether Dosage Form should also factor into this uniqueness check is flagged in Assumptions section 15 item 2.)
- End Date cannot be before Start Date.
- Stopped medications become read-only — no field may be edited once a medication is Stopped (see section 5.5/5.7).
- Resume creates a new active medication record rather than reactivating the stopped one in place (see section 5.8 for the full reasoning) — the stopped record is never mutated by a Resume action.
- A complete audit trail must be maintained: who/when created, who/when stopped, and (per section 5.8) traceability from a resumed record back to the medication it superseded.
- Deactivating a patient (Patient Management) does not automatically stop that patient's active medications — this spec does not require cascading a patient deactivation into this module's data, matching the non-destructive precedent used elsewhere, but this interaction is not explicitly specified by the originating task and should be confirmed (Assumptions section 15 item 5).

---

# 7. Validation Rules

Required (Add Medication):

- Medicine selection
- Dose
- Dose Unit
- Frequency
- Duration
- Duration Unit
- Quantity
- Instructions
- PRN
- Start Date

Validation:

- Patient must be active
- Medicine must be active
- No existing active medication with the same Medicine + Strength for this patient
- End Date, if supplied, must not be before Start Date
- Start Date cannot be in the future beyond what clinical policy allows (not specified — flagged as an open item, section 15 item 7; unlike Patient Management's explicit "cannot be in the future" rule for Date of Birth, no equivalent constraint is stated here for Start Date, and one may not even be appropriate since a medication could reasonably be scheduled to start on a near-future date)
- Maximum field lengths (Instructions, Clinical Notes) — to be sized in the Database Specification

---

# 8. Authorization

Administrator:

- Full access — View, Search, Filter, Add, Edit, Stop, Resume, View Details, View History.

Doctor:

- Full access — identical to Administrator.

Pharmacist:

- View only — List, Search, Filter, Details, History. No Add/Edit/Stop/Resume.

Receptionist:

- View only — identical to Pharmacist.

This is a third distinct authorization shape in this project (Patient Management split write access across Administrator/Doctor/Receptionist; Medicine Management restricted all writes to Administrator only; this module gives Doctors the same full access as Administrators, while Pharmacists — who had View-only in both prior modules — remain View-only here too). This is a deliberate, clinically sensible pattern (a Doctor actively manages a patient's medication list; a Pharmacist reviews it before dispensing), not an inconsistency to reconcile with the other two modules.

---

# 9. Non-Functional Requirements

The system shall:

- Implement server-side pagination.
- Implement server-side sorting.
- Provide a responsive UI, consistent with the rest of the application's enterprise layout.
- Maintain audit logging for every Patient Medication record (Created By/Date, Stopped By/Date at minimum — see section 6).
- Be optimized for **large patient medication histories** — this is a new, explicit scale consideration distinct from Patient Management's per-patient row count (which is small) and Medicine Management's total-catalog-size concern (a few thousand rows): a single long-term patient could accumulate many dozens of historical medication entries over years of care, and the system as a whole could have this multiplied across every patient. Both per-patient history size and total cross-patient table size should inform indexing at the Database Specification stage.

---

# 10. Audit Requirements

Maintain, on every Patient Medication record:

- Created By
- Created Date
- Updated By
- Updated Date
- Stopped By
- Stopped Date

(Exact column shape — e.g. whether "resumed from" traceability is a foreign key on the new record or reconstructed by matching Medicine+Patient+chronology — is a Database Specification decision, not resolved here; see Assumptions section 15 item 6.)

---

# 11. Future Integration

## 11.1 Patient Management

Every Patient Medication references exactly one `Patient`. This module does not duplicate any patient data (name, status) — it reads `Patient.IsActive` to enforce "only active patients can receive medications" (section 6) and displays patient identity by reference, not by copy.

## 11.2 Medicine Management

Every Patient Medication references exactly one `Medicine`. Medicine Name, Generic Name, Strength, Dosage Form, and Route are populated from the Medicine Master at Add-time (section 5.4) and are not independently editable — they always reflect the referenced Medicine's catalog data, not a snapshot copied at creation time (see Assumptions section 15 item 4 for the snapshot-vs-live-reference question this raises). Only active medicines are selectable (section 6).

## 11.3 Prescription Management

This is the most important forward-looking integration point, and the task explicitly requires it to be documented precisely:

**During Create Prescription, the clinician shall be able to select one or more of the patient's current Patient Medications, and may also add additional medicines chosen directly from the Medicine Master** (i.e. a new medicine not currently on the patient's medication list). This means:

- A Prescription is not required to originate from an existing Patient Medication — a clinician can prescribe something entirely new.
- Selecting an existing Patient Medication for a Prescription does not itself Stop, Resume, or otherwise alter that Patient Medication record — prescribing and maintaining the medication list are related but independent actions, unless the future Prescription Management specification decides otherwise.
- Whether creating a Prescription for a medicine not yet on the patient's medication list should automatically **also** create a new Patient Medication entry (keeping the list current) is a genuine open design question for the future Prescription Management module, not decided here — flagged in Assumptions section 15 item 8.

---

# 12. Acceptance Criteria

The feature shall be considered complete when:

- Administrators and Doctors can view, search, filter, add, edit, stop, and resume patient medications, and view medication details/history.
- Pharmacists and Receptionists can view, search, filter, view details, and view history, with no write access.
- A patient cannot end up with two active medications for the same Medicine + Strength.
- Only active patients and active medicines can be involved in a new Add Medication action.
- Stopping a medication makes it permanently read-only.
- Resuming a medication creates a new record without altering the stopped one.
- The complete medication history (all Stop/Resume cycles) remains visible and accurate for every patient.
- Documentation has been completed and approved.

---

# 13. Risks

- **Resume-creates-new-record could surprise users expecting "undo".** A clinician might expect Resume to simply un-stop the exact same record; the chosen approach (new record) is the right one for audit-trail integrity (section 5.8), but the UI will need to make this clear (e.g. showing "Resumed from [previous record]" rather than presenting it as if nothing happened).
- **Cross-patient search performance.** Section 5.2's "Patient Name" search implies a potentially large cross-patient query surface, compounded by section 9's "large patient medication histories" scale target — this combination deserves specific attention at the Database Specification and API Specification stages.
- **Duplicate-active-medication check granularity.** If Dosage Form should have been part of the uniqueness check (Assumptions section 15 item 2) and isn't, two clinically distinct active entries (e.g. an oral and a topical form of the same medicine+strength) could be incorrectly blocked — or the reverse, if the check is too loose.
- **Snapshot vs. live reference for Medicine details.** If Medicine Management data changes after a Patient Medication references it (e.g. a correction to Strength), whether historical Patient Medication records should reflect the old or new value is unresolved (Assumptions section 15 item 4) — this affects historical accuracy of the audit trail.

---

# 14. Dependencies

This feature depends on:

- Patient Management (patient identity, `IsActive` status — approved)
- Medicine Management (medicine catalog, `IsActive` status, Dosage Form/Route — approved)
- Authentication module (role-based authorization — approved)
- Lookup Management (indirectly, via Medicine Management's Dosage Form/Route — approved)

Future modules depending on this feature:

- Prescription Management (selects Patient Medications when creating a prescription, per section 11.3)

---

# 15. Assumptions / Open Items

1. **Two access patterns are assumed for the list/search screens**: a per-patient view (nested under an existing Patient's own record) and a global cross-patient view (where "Patient Name" search, section 5.2, is meaningful). The originating task doesn't explicitly distinguish these; both are assumed in scope, but which pages the UI Specification stage builds (one, the other, or both) should be confirmed before that stage begins.
2. **The duplicate-active-medication check considers only Medicine + Strength, not Dosage Form**, matching the literal business rule wording. Confirm whether two active entries of the same medicine+strength but different dosage form (e.g. oral tablet vs. topical cream) should be allowed to coexist (assumed yes, under the literal reading) or blocked (if Dosage Form should also be part of the uniqueness key).
3. **"Read-only" for a Stopped medication is interpreted as fully immutable** — no field, including Clinical Notes or Instructions, may be corrected after stopping in V1. If a correction capability is actually needed (e.g. fixing a typo discovered after stopping), that's a Future Enhancement, not V1 scope.
4. **Medicine details (Name/Generic Name/Strength/Dosage Form/Route) are assumed to be a live reference to the Medicine Master, not a snapshot copied at Add-time.** This means a later correction to a Medicine's catalog data would retroactively change how historical Patient Medication records display — the alternative (snapshotting these fields at creation time) would preserve historical accuracy but duplicate data. This is a genuine Database Specification decision, flagged here because it materially affects historical audit accuracy (see Risk section 13).
5. **Patient deactivation does not cascade** to automatically stop that patient's active medications. Not explicitly specified by the task; assumed consistent with this project's general non-destructive/non-cascading precedent, but should be explicitly confirmed given the clinical significance (an inactive/discharged patient still shown with "active" medications could be misleading).
6. **A resumed medication's traceability link back to the medication it superseded** is required by section 6's audit-trail rule but its exact mechanism (a `PreviousPatientMedicationId`-style self-referencing foreign key, versus reconstructing the chain from Patient+Medicine+chronological ordering) is left to the Database Specification.
7. **No explicit rule constrains how far in the future a Start Date may be set** (unlike Patient Management's explicit "Date of Birth cannot be in the future" rule) — assumed unconstrained for V1 pending clinical policy input, since a medication can reasonably be scheduled ahead of its actual start.
8. **Whether creating a Prescription for a brand-new medicine (not yet on the patient's medication list) should automatically create a corresponding Patient Medication entry** is explicitly left for the future Prescription Management specification to decide (section 11.3) — not resolved here, since it would be presumptuous to constrain a module that hasn't been specified yet.
