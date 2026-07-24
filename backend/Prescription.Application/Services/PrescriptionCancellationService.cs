using Prescription.Application.Repositories;

namespace Prescription.Application.Services;

// Thin passthrough - every validation rule (prescription exists, not still Draft, not
// already cancelled, not fully dispensed) is authoritative in usp_Prescription_Cancel,
// matching PrescriptionFinalizeService's identical style for the same kind of
// single-query status-transition check.
public class PrescriptionCancellationService : IPrescriptionCancellationService
{
    private readonly IPrescriptionCancellationRepository _prescriptionCancellationRepository;

    public PrescriptionCancellationService(IPrescriptionCancellationRepository prescriptionCancellationRepository)
    {
        _prescriptionCancellationRepository = prescriptionCancellationRepository;
    }

    public Task<PrescriptionCancellationResult> CancelAsync(
        int prescriptionId,
        string cancellationType,
        string cancellationReason,
        string comments,
        string cancelledBy)
        => _prescriptionCancellationRepository.CancelAsync(prescriptionId, cancellationType, cancellationReason, comments, cancelledBy);
}
