namespace Prescription.Application.Repositories;

// The header result set of usp_Prescription_GetDetailsById - Prescription Details page
// only, distinct from PrescriptionDetail (Step 18.6's minimal PDF-generation lookup,
// which stays as-is). Flat/joined, same reasoning as PrescriptionListItem.
public class PrescriptionDetailsView
{
    public int PrescriptionId { get; set; }
    public string PrescriptionNumber { get; set; }
    public string StatusCode { get; set; }
    public string StatusDisplayText { get; set; }
    public int? VersionNumber { get; set; }
    public DateTime IssueDate { get; set; }
    public DateTime? ExpiryDate { get; set; }
    public int MedicationCount { get; set; }
    public int PrintCount { get; set; }
    public string ClinicalNotes { get; set; }
    public string CreatedBy { get; set; }
    public DateTime CreatedDate { get; set; }
    public string UpdatedBy { get; set; }
    public DateTime? UpdatedDate { get; set; }
    public DateTime? FinalizedDate { get; set; }
    public string FinalizedBy { get; set; }
    public byte[] RowVersion { get; set; }
    public string Xhtml { get; set; }

    public int PatientId { get; set; }
    public string PatientFirstName { get; set; }
    public string PatientLastName { get; set; }
    public string NHINumber { get; set; }
    public DateTime PatientDateOfBirth { get; set; }
    public string GenderCode { get; set; }
    public string GenderDisplayText { get; set; }
    public string PatientMobileNumber { get; set; }
    public string PatientAddressLine1 { get; set; }
    public string PatientAddressLine2 { get; set; }
    public string PatientCity { get; set; }
    public string PatientRegion { get; set; }
    public string PatientPostalCode { get; set; }
    public string PatientCountry { get; set; }

    public int ProviderUserAccountId { get; set; }
    public string ProviderName { get; set; }
    public string ProviderEmail { get; set; }
    public string ProviderPhoneNumber { get; set; }
}
