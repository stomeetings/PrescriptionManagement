namespace Prescription.Shared.DTOs;

public class PrescriptionVersionDetailResponse
{
    public int PrescriptionId { get; set; }
    public int VersionNumber { get; set; }
    public string ClinicalNotes { get; set; }
    public string Xhtml { get; set; }
    public PrescriptionStatusResponse Status { get; set; }
    public string ChangeSummary { get; set; }
    public DateTime SavedDate { get; set; }
    public string SavedBy { get; set; }
    public List<PrescriptionVersionItemResponse> Items { get; set; } = new();
}
