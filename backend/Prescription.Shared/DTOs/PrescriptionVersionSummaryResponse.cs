namespace Prescription.Shared.DTOs;

public class PrescriptionVersionSummaryResponse
{
    public int VersionNumber { get; set; }
    public string ChangeSummary { get; set; }
    public PrescriptionStatusResponse Status { get; set; }
    public DateTime SavedDate { get; set; }
    public string SavedBy { get; set; }
}
