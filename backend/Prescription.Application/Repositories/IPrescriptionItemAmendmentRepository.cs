using Prescription.Domain.Entities;

namespace Prescription.Application.Repositories;

// Named per this feature's own explicit request - a separate repository from
// IPrescriptionRepository, matching PrescriptionVersionRepository/
// PrescriptionFinalizeRepository/PrescriptionPrintHistoryRepository's identical
// one-concern-per-repository precedent already established for this module.
public interface IPrescriptionItemAmendmentRepository
{
    // Single-result convenience for the frontend's "does this medication belong to an
    // active prescription" pre-check (GET .../active) - it only ever needs a yes/no, so
    // it takes whichever active item comes back first rather than the full list.
    Task<PrescriptionItemActiveLookup?> FindActiveItemAsync(int patientMedicationId);

    // Every currently-ACTIVE item for this Patient Medication, across however many
    // Prescriptions it's active on - AmendAsync supersedes all of them, not just one.
    Task<IEnumerable<PrescriptionItemActiveLookup>> FindAllActiveItemsAsync(int patientMedicationId);

    // No business-rule validation here beyond the one condition that can genuinely race
    // (the item(s) still being ACTIVE) - PrescriptionItemAmendmentService already
    // validated everything else (finalized/active/not cancelled, medicine/patient/
    // provider active, clinically-significant change detected) before calling this.
    // Driven by patientMedicationId alone (no specific item id) - the stored procedure
    // discovers and supersedes every currently-ACTIVE item for it itself.
    // newItemSnapshot's PrescriptionId/PrescriptionItemId/CreatedDate/CreatedBy are
    // ignored, same convention as IPrescriptionRepository.CreateDraftAsync's items
    // parameter - the stored procedure assigns them.
    Task<PrescriptionItemAmendmentResult> AmendAsync(
        int patientMedicationId,
        string reason,
        PrescriptionItem newItemSnapshot,
        string newXhtml,
        DateTime newIssueDate,
        string amendedBy);
}
