namespace Prescription.Application.Repositories;

// One row of usp_Prescription_GetDetailsById's third result set - a raw PrescriptionAudit
// row. Action is one of CREATED/UPDATED/PDF_GENERATED/RESTORED/FINALIZED (the only values
// CK_PrescriptionAudit_Action allows) - mapping these to the Timeline's display
// labels/icons is presentation logic and belongs in the frontend
// (PrescriptionTimeline.jsx), not here.
public class PrescriptionTimelineEvent
{
    public string Action { get; set; }
    public string ChangedBy { get; set; }
    public DateTime ChangedDate { get; set; }
    public int? VersionNumber { get; set; }
    public string ChangedFields { get; set; }
}
