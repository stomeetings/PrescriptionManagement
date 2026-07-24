namespace Prescription.Shared.DTOs;

// One row in the View/Search Patients list - matches api-spec.md section 6's
// PatientListResponse shape exactly.
public class PatientListResponse
{
    public int PatientId { get; set; }
    public string PatientNumber { get; set; }
    public string FullName { get; set; }
    public DateTime DateOfBirth { get; set; }
    public GenderResponse Gender { get; set; }
    public string? MobileNumber { get; set; }
    public string? Email { get; set; }
    public string? NHINumber { get; set; }
    public bool IsActive { get; set; }
    public DateTime? UpdatedDate { get; set; }
}
