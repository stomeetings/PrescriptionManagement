using Prescription.Application.Repositories;

namespace Prescription.Application.Services;

// Thin passthrough - every validation rule (Draft exists, patient/provider active,
// medications exist/active/no duplicates/directions complete, issue/expiry date valid,
// not already finalized) is authoritative in usp_Prescription_Finalize, matching how
// PrescriptionVersionService.RestoreAsync already defers to its own stored procedure for
// the same kind of single-query existence/state checks.
public class PrescriptionFinalizeService : IPrescriptionFinalizeService
{
    private readonly IPrescriptionFinalizeRepository _prescriptionFinalizeRepository;

    public PrescriptionFinalizeService(IPrescriptionFinalizeRepository prescriptionFinalizeRepository)
    {
        _prescriptionFinalizeRepository = prescriptionFinalizeRepository;
    }

    public Task<PrescriptionFinalizeResult> FinalizeAsync(int prescriptionId, string finalizedBy)
        => _prescriptionFinalizeRepository.FinalizeAsync(prescriptionId, finalizedBy);
}
