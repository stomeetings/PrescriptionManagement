namespace Prescription.Shared.DTOs;

// One PrescriptionAudit row, chronological. Action is one of CREATED/UPDATED/
// PDF_GENERATED/RESTORED/FINALIZED - PrescriptionTimeline.jsx maps these to display
// labels/icons; there is no PRINTED or CANCELLED action (Print never calls the backend
// today, and no Cancel capability exists yet - see PrescriptionTimeline.jsx's own
// comment), so this response never contains either.
public class PrescriptionTimelineEventResponse
{
    public string Action { get; set; }
    public string ChangedBy { get; set; }
    public DateTime ChangedDate { get; set; }
    public int? VersionNumber { get; set; }
    public string? ChangedFields { get; set; }
}
