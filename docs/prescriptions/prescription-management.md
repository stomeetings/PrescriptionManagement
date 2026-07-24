# Prescription Management Specification — Phase 1: Generate Draft & Preview

**Feature:** Prescription Management (Phase 1 of a larger module)
**Status:** Draft
**Version:** 1.0

---

# 1. Overview

The Prescription Management module is the part of the system that turns a clinician's decision to prescribe into a formal `Prescription` record. `CLAUDE.md`'s already-approved architecture fixes the module's core shape ahead of this document: entities `Prescription`/`PrescriptionItem`, and a status lifecycle `Draft → Pending → Processing → Sent → Dispensed` (with `Cancelled`/`Failed`/`Expired` branches), driven onward from `Pending` by the `Prescription.Worker` background service.

**This specification covers only Phase 1: reaching the `Draft` status** — generating a prescription from one or more of a patient's current Patient Medications, previewing it as a printable document, and saving it as a `Draft`. Submitting a Draft onward (`Draft → Pending`, NZePS transmission, the Worker's `Pending → Processing → Sent` cycle, `Dispensed`, retries, `Failed`/`Expired`) is explicitly **out of scope** here — see section 4 — and will be specified as a later phase once this phase is built and reviewed.

A Prescription is a distinct concept from a Patient Medication (`docs/patient-medications/patient-medication-management.md` section 1 already draws this line): a Patient Medication is an entry on a patient's ongoing medication list; a Prescription is the formal, point-in-time clinical act of prescribing, which may draw on one or more existing Patient Medications, and produces its own independent record that does not change if the medication list changes later (see section 6).

---

# 2. Business Goals

Phase 1 shall:

- Let a Doctor or Administrator assemble a Prescription from one or more of a patient's **current** Patient Medications, without retyping any clinical detail already on file.
- Produce a reviewable, printable representation of the prescription before anything is committed.
- Persist a `Draft` Prescription (and its line items) only when the clinician explicitly confirms — never as a side effect of merely previewing.
- Guarantee that once saved, a Draft's clinical content is a fixed snapshot — later edits to the source Medicine catalog or Patient Medication list must never retroactively alter a prescription that has already been drafted (section 6).
- Lay the groundwork for later phases (submission, Worker-driven delivery, dispensing) without building any of that logic now.

---

# 3. Scope

Phase 1 includes:

- Generate Prescription Draft (preview) from selected Patient Medications
- Prescription Preview display (printable document)
- Print the preview
- Save Draft (persists the Prescription)
- Cancel (discards the preview, persists nothing)

---

# 4. Out of Scope

The following are explicitly deferred to a later phase, per this task's own instruction ("Do not send to NZePS yet"):

- Submitting a Draft for delivery (`Draft → Pending` transition) and everything downstream of it: NZePS transmission, the `Prescription.Worker`'s `Pending → Processing → Sent` cycle, retries, `Dispensed`, `Cancelled`/`Failed`/`Expired`
- Editing or deleting a saved Draft
- Viewing a list of previously-saved Drafts (a "Prescription List/Details" screen)
- Adding a medicine to a prescription that is **not** already one of the patient's current Patient Medications (patient-medication-management.md section 11.3 anticipated this as a future capability of the eventual Create Prescription screen; Phase 1 only ever drafts from the medications already selected in the Patient Medications grid)
- Electronic signature / prescriber authentication beyond the existing JWT session
- Any NZ ePrescription Service (NZePS) regulatory document formatting — the XHTML produced by Phase 1 is a generic, human-readable prescription layout, not a certified NZePS-compliant document (see Assumptions section 15 item 1)
- Dispensing workflows

---

# 5. Functional Requirements

## 5.1 Generate Prescription Draft (Preview)

Reached from Patient Details → Patient Medications, where the grid already supports multi-select (`patient-medication-management.md` section 5.1; implemented in the Patient Medication UI's List step). When one or more **current** (Active) Patient Medications are selected, the toolbar's "Generate Prescription" action becomes enabled.

Triggering it:

1. Collects the selected Patient Medication IDs.
2. Calls the backend to assemble a draft. The backend re-validates (reusing the existing eligibility rules already enforced by `POST /api/patient-medications/generate-prescription`): the patient must be active, and each selected Patient Medication must still belong to that patient and still be current — one that was stopped since being selected is excluded with a notice, not a hard failure, exactly as already specified.
3. The backend returns a rendered, printable document (XHTML) representing the draft prescription — header (patient, prescriber, date), one line per included medication (Medicine Name, Generic Name, Strength, Dose, Dose Unit, Frequency, Duration, Duration Unit, Quantity, Instructions, PRN indicator), and any non-fatal exclusion notices from step 2.
4. **Nothing is persisted by this step** — generating a preview is non-destructive and repeatable, matching the existing `generate-prescription` endpoint's own documented behavior (`api-spec.md` section 4.8: *"it does not create, persist, or reserve any row in any Prescription-shaped table"*), now extended to also produce the XHTML preview rather than only the JSON summary it returns today.

## 5.2 Prescription Preview Dialog

Displays the XHTML returned by 5.1 to the clinician for review before committing to anything. Offers three actions:

- **Print** — sends the preview to the browser's print flow. Does not persist anything and does not require another backend call.
- **Save Draft** — see 5.3.
- **Cancel** — closes the dialog without persisting anything; the clinician returns to the Patient Medications grid with their selection intact (so they can adjust the selection and try again without starting over).

## 5.3 Save Draft

Persists the previewed prescription as a `Prescription` record in `Draft` status, with one `PrescriptionItem` per included medication.

- Re-validates the same eligibility rules as 5.1 immediately before saving (patient still active; each item's source Patient Medication still current) — the gap between generating a preview and clicking Save Draft is a real window for another user to have changed something, and Save Draft must not silently commit against stale data.
- Snapshots each item's clinical detail (Medicine identity, Dose, Dose Unit, Frequency, Duration, Duration Unit, Quantity, Instructions, PRN) into the `PrescriptionItem` at the moment of saving — **this is a deliberate reversal of Patient Medication's "live reference" design** (section 11.2 of the sibling spec: Patient Medication always reflects the Medicine Master's current data). A Prescription is a point-in-time clinical/legal document; if the Medicine catalog is corrected afterward, or the source Patient Medication is later edited or stopped, an already-saved Draft must continue to show exactly what was prescribed at save time. See Assumptions section 15 item 2.
- Records which Patient Medication (if any) each item was drafted from, for traceability — mirrors the same "resumed from" traceability pattern already used by Patient Medication's own Resume feature.
- Does not stop, resume, or otherwise alter the source Patient Medication records — prescribing and maintaining the medication list remain independent actions, exactly as `patient-medication-management.md` section 11.3 already anticipated.
- On success, the clinician returns to the Patient Medications grid; selection is cleared.

---

# 6. Business Rules

- Only a Doctor or Administrator may generate a preview or save a Draft (matches Patient Medication's own `generate-prescription` authorization — see section 8).
- A Prescription cannot be generated for an inactive patient.
- Every included item's source Patient Medication must be current (Active) at generation time; one that has since been stopped is excluded from the draft with a notice, not a hard failure — carried over unchanged from the already-approved `generate-prescription` endpoint's rule.
- If none of the selected Patient Medications are still eligible by the time of generation, the action fails outright (nothing to draft) — also carried over unchanged.
- A saved Draft's clinical content is immutable at the point of saving (snapshot, not a live reference) — see section 5.3.
- Saving a Draft never mutates the source Patient Medication records.
- A `DraftPrescriptionId` from a preview that was never saved has no lasting meaning — it is a transient correlation identifier only, exactly as `api-spec.md` section 6 already documents for the existing endpoint.

---

# 7. Validation Rules

- At least one Patient Medication ID must be supplied to generate a preview.
- Patient must be active (422, matching the existing convention documented in `patient-medication-management.md`'s sibling API spec).
- Each supplied Patient Medication ID must belong to the given patient and currently be Active — otherwise excluded (non-fatal) or, if none remain, a hard failure (422).
- Save Draft re-runs the same two checks immediately before persisting — a race between preview and save must produce the same class of error (422/409), not an unhandled failure.

---

# 8. Authorization

Administrator:

- Full access — Generate Preview, Print, Save Draft.

Doctor:

- Full access — identical to Administrator.

Pharmacist:

- No access to this feature in Phase 1 (a Pharmacist may view a patient's medications but does not prescribe).

Receptionist:

- No access to this feature in Phase 1.

This matches the authorization tier already established for Patient Medication's `generate-prescription` action (`patient-medications/api-spec.md` section 3: `SYSTEM_ADMINISTRATOR`, `DOCTOR` only) — not a new pattern, a continuation of it.

---

# 9. Non-Functional Requirements

The system shall:

- Render the preview document server-side as XHTML (well-formed XML, renderable directly in a browser and suitable as the basis for a later PDF/print pipeline) — see Assumptions section 15 item 1 for why this is a generic layout, not a certified regulatory format, in Phase 1.
- Keep preview generation non-destructive and idempotent — calling it repeatedly with the same selection must be safe and side-effect-free, exactly as today's `generate-prescription` endpoint already guarantees.
- Keep Save Draft's snapshot-write a single atomic operation (the `Prescription` row and all its `PrescriptionItem` rows succeed or fail together) — a partially-saved Draft (e.g. header saved, items missing) would be a worse failure mode than the whole operation failing outright.
- Provide a responsive UI for the Preview dialog, consistent with the rest of the application's enterprise layout.

---

# 10. Audit Requirements

Maintain, on every saved `Prescription` record (Draft or otherwise, per `CLAUDE.md`'s already-established audit-column convention):

- Created By
- Created Date
- Current Status (`Draft` for every record this phase can produce)

Maintain, on every `PrescriptionItem`:

- The source Patient Medication ID it was drafted from (if any)
- The snapshotted clinical detail itself, which **is** the audit record of what was actually prescribed — this is why section 5.3 insists on a snapshot rather than a live reference.

---

# 11. Future Integration

## 11.1 Patient Medication Management

Phase 1 is entirely downstream of Patient Medication Management: it reads the current medication list, the multi-select grid, and reuses the existing `generate-prescription` eligibility rules. It does not write back to Patient Medication records at all (section 6).

## 11.2 Later Prescription Management phases

This document deliberately stops at `Draft`. A future phase must specify: how a Draft transitions to `Pending` (an explicit clinician action? automatic?), the NZePS submission contract, how the `Prescription.Worker` polls and processes `Pending` records, retry/backoff policy for `Failed`, what causes `Expired`, and a Prescription List/Details UI for managing saved Drafts and their onward status. None of this is assumed or pre-designed here beyond the status-name skeleton already fixed by `CLAUDE.md`.

## 11.3 Medicine Management

Each `PrescriptionItem`'s Medicine identity is resolved from the Medicine Master at draft-generation time, then snapshotted at save time (section 5.3) — Medicine Management remains the source of truth only up to the moment of saving.

---

# 12. Acceptance Criteria

Phase 1 shall be considered complete when:

- A Doctor or Administrator can select one or more current Patient Medications in the Patient Medications grid and generate a preview.
- The preview is a rendered, printable XHTML document showing patient, prescriber, and every included medication's clinical detail.
- Print sends the preview to the browser's print flow without persisting anything.
- Cancel discards the preview without persisting anything and preserves the grid's selection.
- Save Draft persists exactly one `Prescription` (status `Draft`) and one `PrescriptionItem` per included medication, snapshotted at save time.
- Neither generating nor cancelling a preview alters any Patient Medication record; Save Draft doesn't either.
- Pharmacists and Receptionists cannot reach this feature.
- Documentation has been completed and approved.

---

# 13. Risks

- **XHTML is a real, unreviewed format decision.** Nothing in the approved architecture previously specified a document-rendering format; this document picks XHTML because the originating task named it explicitly, but the actual template (letterhead, required regulatory fields, layout) has no design yet — flagged in Assumptions section 15 item 1 rather than invented wholesale here.
- **Snapshot-vs-live-reference is a deliberate reversal of an established pattern.** Patient Medication Management's own spec chose live-reference for Medicine details; this document chooses the opposite for Prescriptions, for a materially different reason (legal/clinical point-in-time integrity). Implementers should not assume the two modules share a data-freshness philosophy.
- **Save Draft's re-validation could surprise a clinician** who reviewed a preview, stepped away, and returns later to find Save Draft fails or silently drops an item that was stopped in the meantime — the UI must surface this clearly (an updated notice list, not a silent difference between what was previewed and what got saved).
- **This phase's scope boundary (stopping at Draft) must be visible in the UI**, not just this document — a clinician should not come away thinking "Save Draft" means the prescription has been sent anywhere.

---

# 14. Dependencies

This feature depends on:

- Patient Medication Management (current medication list, multi-select grid, `generate-prescription` eligibility rules — approved)
- Medicine Management (medicine catalog — approved)
- Patient Management (patient identity, `IsActive` status — approved)
- Authentication module (role-based authorization — approved)

Future phases depending on this feature:

- Prescription submission/delivery (Draft → Pending → Processing → Sent, `Prescription.Worker`, NZePS integration, Dispensed/Cancelled/Failed/Expired)

---

# 15. Assumptions / Open Items

1. **XHTML content/layout is not specified anywhere yet.** This document assumes a generic, human-readable prescription layout (patient identity, prescriber identity, date, one row per medicine with dose/frequency/duration/quantity/instructions/PRN) is sufficient for Phase 1's "preview and print" purpose, and explicitly does **not** assume this satisfies any real NZePS regulatory document schema — that would need its own specification once NZePS integration (out of scope here) is actually designed.
2. **Snapshot vs. live reference for `PrescriptionItem`'s clinical data** is resolved here as snapshot (section 5.3), the opposite of Patient Medication's own live-reference choice — confirm this reversal is intentional and acceptable before implementation, since it's a meaningfully different data-integrity philosophy from the sibling module.
3. **Whether Save Draft should be allowed to succeed partially** (e.g. save the Prescription header but drop an item that became ineligible between preview and save, rather than failing the whole save) is resolved here as "no" (section 9's atomicity requirement) — an all-or-nothing save was chosen as safer than a partial one, but this hasn't been explicitly requested or rejected by name.
4. **No Prescription List/Details screen is included in this phase** — a saved Draft is not yet visible or manageable anywhere in the UI after Save Draft succeeds beyond the success notification. This is assumed acceptable for Phase 1 (the immediate ask was Generate/Preview/Save, not manage), but means a saved Draft is, practically, only confirmable by re-checking the database until a later phase adds that screen.
5. **`PrescribedByUserAccountId` on each `PrescriptionItem`/the `Prescription` header is assumed to be the authenticated caller** (the Doctor generating the draft), not a separately-selectable field — consistent with how Patient Medication's own `prescribedByUserAccountId` is documented as "independent of the authenticated caller" for *its* Create action, but here there is no other clinician in view to select instead, since generation only happens from an authenticated Doctor's own session.
