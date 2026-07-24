namespace Prescription.Application.Repositories;

// One row of usp_Prescription_GetAll/usp_Prescription_Search's result set - already
// flat (patient/provider names, medication count, current version number all computed
// server-side), unlike Patient's (Patient, Gender) tuple approach - no separate lookup
// object is needed here since every displayed field is either a plain column or an
// aggregate, not a full related-entity shape the grid needs independently.
public class PrescriptionListItem
{
    public int PrescriptionId { get; set; }
    public string PrescriptionNumber { get; set; }
    public int PatientId { get; set; }
    public string PatientName { get; set; }
    public string NHINumber { get; set; }
    public int ProviderUserAccountId { get; set; }
    public string ProviderName { get; set; }
    public DateTime IssueDate { get; set; }
    public DateTime? ExpiryDate { get; set; }
    public int MedicationCount { get; set; }
    public string StatusCode { get; set; }
    public string StatusDisplayText { get; set; }
    public int? VersionNumber { get; set; }
    public string CreatedBy { get; set; }
    public DateTime CreatedDate { get; set; }
}
