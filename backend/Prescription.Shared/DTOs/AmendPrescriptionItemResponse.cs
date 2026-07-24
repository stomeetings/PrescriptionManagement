namespace Prescription.Shared.DTOs;

// OriginalPrescriptions is a list, not a single value - a Patient Medication can be
// ACTIVE on more than one Prescription at once, and amending it supersedes every one of
// those items (potentially cancelling more than one original Prescription), while still
// creating only the one new replacement.
public class AmendPrescriptionItemResponse
{
    public List<OriginalPrescriptionForAmendmentResponse> OriginalPrescriptions { get; set; }
    public PrescriptionSummaryForAmendmentResponse ReplacementPrescription { get; set; }
    public string NewScid { get; set; }
}

public class OriginalPrescriptionForAmendmentResponse
{
    public int PrescriptionId { get; set; }
    public string PrescriptionNumber { get; set; }
    public PrescriptionStatusResponse Status { get; set; }
    public string OldScid { get; set; }
}

public class PrescriptionSummaryForAmendmentResponse
{
    public int PrescriptionId { get; set; }
    public string PrescriptionNumber { get; set; }
    public PrescriptionStatusResponse Status { get; set; }
}
