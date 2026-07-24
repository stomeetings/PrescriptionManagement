using Prescription.Application.Repositories;

namespace Prescription.Application.Services;

public interface IPrescriptionReprintService
{
    Task<PrescriptionReprintResult> ReprintAsync(int prescriptionId, string reason, int copies, string reprintedBy);
}
