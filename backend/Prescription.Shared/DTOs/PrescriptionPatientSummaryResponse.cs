namespace Prescription.Shared.DTOs;

// The Prescription Details page's Patient Section - Patient Name/NHI/DOB/Gender/Phone/
// Address only, not PatientDetailResponse's full field set (RowVersion/IsActive/Notes/
// audit columns aren't relevant here). Address stays as separate parts, matching
// PatientDetailResponse's own convention, rather than a pre-concatenated string.
public class PrescriptionPatientSummaryResponse
{
    public int PatientId { get; set; }
    public string FullName { get; set; }
    public string? NHINumber { get; set; }
    public DateTime DateOfBirth { get; set; }
    public GenderResponse Gender { get; set; }
    public string? MobileNumber { get; set; }
    public string? AddressLine1 { get; set; }
    public string? AddressLine2 { get; set; }
    public string? City { get; set; }
    public string? Region { get; set; }
    public string? PostalCode { get; set; }
    public string? Country { get; set; }
}
