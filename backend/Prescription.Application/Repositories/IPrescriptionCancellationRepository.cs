namespace Prescription.Application.Repositories;

public interface IPrescriptionCancellationRepository
{
    Task<PrescriptionCancellationResult> CancelAsync(
        int prescriptionId,
        string cancellationType,
        string cancellationReason,
        string comments,
        string cancelledBy);
}
