namespace Prescription.Application.Repositories;

// Returned by IPrescriptionRepository.GetByIdAsync - deliberately does not include line
// items (Step 18.6's own prerequisite scope; the future Prescription Editor will need a
// richer read model when it's actually built).
public class PrescriptionDetail
{
    public int PrescriptionId { get; set; }
    public string PrescriptionNumber { get; set; }
    public Guid DraftPrescriptionId { get; set; }
    public int PatientId { get; set; }
    public int ProviderUserAccountId { get; set; }
    public string StatusCode { get; set; }
    public string StatusDisplayText { get; set; }
    public string ClinicalNotes { get; set; }
    public string Xhtml { get; set; }
    public DateTime IssueDate { get; set; }
    public DateTime? ExpiryDate { get; set; }
    public byte[] RowVersion { get; set; }
    public DateTime CreatedDate { get; set; }
    public string CreatedBy { get; set; }
    public DateTime? UpdatedDate { get; set; }
    public string UpdatedBy { get; set; }
}
