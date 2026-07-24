namespace Prescription.Application.Repositories;

// Named per this feature's own explicit request - a separate repository from
// IPrescriptionRepository, mirroring PrescriptionVersionRepository/
// PrescriptionFinalizeRepository's identical one-concern-per-repository precedent
// already established for this module.
public interface IPrescriptionPrintHistoryRepository
{
    // No business-rule validation here - PrescriptionReprintService already validated
    // (not Draft/not Cancelled/exists/Xhtml present) using the existing
    // IPrescriptionRepository.GetByIdAsync before calling this. This just records the
    // event and returns the derived PrintCount/VersionPrinted.
    Task<PrescriptionReprintResult> ReprintAsync(int prescriptionId, string reason, int copies, string printedBy);
}
