using Prescription.Application.Repositories;

namespace Prescription.Application.Services;

public interface IPrescriptionFinalizeService
{
    Task<PrescriptionFinalizeResult> FinalizeAsync(int prescriptionId, string finalizedBy);
}
