namespace Prescription.Application.Repositories;

// Returned by usp_PrescriptionVersion_GetAll - the lightweight list-view row for
// PrescriptionVersionHistoryDialog/PrescriptionVersionTimeline. No ClinicalNotes/Xhtml/
// items - see that stored procedure's own comment for why.
public class PrescriptionVersionSummary
{
    public int PrescriptionVersionId { get; set; }
    public int PrescriptionId { get; set; }
    public int VersionNumber { get; set; }
    public string ChangeSummary { get; set; }
    public string StatusCode { get; set; }
    public string StatusDisplayText { get; set; }
    public DateTime SavedDate { get; set; }
    public string SavedBy { get; set; }
}
