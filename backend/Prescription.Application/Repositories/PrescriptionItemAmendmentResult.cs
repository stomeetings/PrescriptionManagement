namespace Prescription.Application.Repositories;

// Returned by usp_PrescriptionItem_Amend's own two final result sets. OriginalPrescriptions
// is a list, not a single value - a Patient Medication can be ACTIVE on more than one
// Prescription at once, and amending it supersedes every one of those items, potentially
// cancelling more than one original Prescription (see the stored procedure's own
// "auto-cancel" comment) - while still creating only the one new replacement.
public class PrescriptionItemAmendmentResult
{
    public List<OriginalPrescriptionAmendmentInfo> OriginalPrescriptions { get; set; }
    public int ReplacementPrescriptionId { get; set; }
    public string ReplacementPrescriptionNumber { get; set; }
    public string ReplacementStatusCode { get; set; }
    public string ReplacementStatusDisplayText { get; set; }
    public string NewScid { get; set; }
}

public class OriginalPrescriptionAmendmentInfo
{
    public int OriginalPrescriptionId { get; set; }
    public string OriginalPrescriptionNumber { get; set; }
    public string OriginalStatusCode { get; set; }
    public string OriginalStatusDisplayText { get; set; }
    public string OldScid { get; set; }
}
