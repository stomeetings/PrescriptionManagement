namespace Prescription.Application.Repositories;

// One selected item's already-resolved final values (override if the clinician changed
// it, else copied from the original PrescriptionItem) - built by PrescriptionRenewalService
// before calling the repository. Medicine/Strength/Dose/DoseUnit/Frequency/Route are
// deliberately absent - "Do not allow modification of: Medicine, Strength" (and, by the
// same reasoning, every other clinically-defining field this feature doesn't list as
// editable) means usp_Prescription_Renew always looks those up fresh from the original
// PrescriptionItem row itself, never trusts them from the caller.
public class PrescriptionRenewalItemSelection
{
    public int PrescriptionItemId { get; set; }
    public decimal Quantity { get; set; }
    public int Duration { get; set; }
    public string Instructions { get; set; }
}
