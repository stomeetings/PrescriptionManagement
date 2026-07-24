using Prescription.Application.Repositories;

namespace Prescription.Application.Services;

public interface IPrescriptionItemAmendmentService
{
    // "Find ACTIVE finalized Prescription Item" - used by the frontend's own "does this
    // medication belong to an active prescription" warning-dialog trigger before Save.
    Task<PrescriptionItemActiveLookup?> FindActiveItemAsync(int patientMedicationId);

    Task<PrescriptionItemAmendmentResult> AmendAsync(int patientMedicationId, string reason, string amendedBy);
}
