using Prescription.Application.Repositories;

namespace Prescription.Application.Services;

public interface IPrescriptionCancellationService
{
    Task<PrescriptionCancellationResult> CancelAsync(
        int prescriptionId,
        string cancellationType,
        string cancellationReason,
        string comments,
        string cancelledBy);
}
