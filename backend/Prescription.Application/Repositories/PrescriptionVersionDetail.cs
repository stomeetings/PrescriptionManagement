namespace Prescription.Application.Repositories;

// Returned by usp_PrescriptionVersion_GetByVersion's two result sets (header + items) -
// full detail for one specific version, used both for the History Dialog's version
// detail view and as the input to PrescriptionVersionService.CompareAsync's diff.
public class PrescriptionVersionDetail
{
    public int PrescriptionVersionId { get; set; }
    public int PrescriptionId { get; set; }
    public int VersionNumber { get; set; }
    public string ClinicalNotes { get; set; }
    public string Xhtml { get; set; }
    public string StatusCode { get; set; }
    public string StatusDisplayText { get; set; }
    public string ChangeSummary { get; set; }
    public DateTime SavedDate { get; set; }
    public string SavedBy { get; set; }
    public IEnumerable<PrescriptionVersionItemDetail> Items { get; set; } = Enumerable.Empty<PrescriptionVersionItemDetail>();
}
