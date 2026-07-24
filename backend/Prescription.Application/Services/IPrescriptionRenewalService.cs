using Prescription.Application.Repositories;

namespace Prescription.Application.Services;

public interface IPrescriptionRenewalService
{
    Task<PrescriptionRenewalResult> RenewAsync(int originalPrescriptionId, IEnumerable<PrescriptionRenewalItemSelection> selectedItems, string renewedBy);
}
