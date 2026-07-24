namespace Prescription.Application.Repositories;

public interface IPrescriptionRenewalRepository
{
    // No business-rule validation here beyond the two conditions that can genuinely race
    // or that SQL is uniquely positioned to check cheaply (original status unchanged,
    // every selected item belongs to the original prescription) -
    // PrescriptionRenewalService already validated everything else (finalized/not
    // cancelled/not expired, patient/provider/medicine active) using data it already
    // fetched.
    Task<PrescriptionRenewalResult> RenewAsync(
        int originalPrescriptionId,
        IEnumerable<PrescriptionRenewalItemSelection> selectedItems,
        string newXhtml,
        string renewedBy);
}
