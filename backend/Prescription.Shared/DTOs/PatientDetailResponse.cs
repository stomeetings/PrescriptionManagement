namespace Prescription.Shared.DTOs;

// Full detail - View Patient Details and the Edit Patient form (business spec section
// 4.6). Carries RowVersion, required on the next Update call for optimistic concurrency.
public class PatientDetailResponse
{
    public int PatientId { get; set; }
    public string PatientNumber { get; set; }
    public string FirstName { get; set; }
    public string LastName { get; set; }
    public string? PreferredName { get; set; }
    public DateTime DateOfBirth { get; set; }
    public GenderResponse Gender { get; set; }
    public string? MobileNumber { get; set; }
    public string? Email { get; set; }
    public string? AddressLine1 { get; set; }
    public string? AddressLine2 { get; set; }
    public string? City { get; set; }
    public string? Region { get; set; }
    public string? PostalCode { get; set; }
    public string? Country { get; set; }
    public string? NHINumber { get; set; }
    public string? NZMCNumber { get; set; }
    public string? Notes { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedDate { get; set; }
    public string CreatedBy { get; set; }
    public DateTime? UpdatedDate { get; set; }
    public string? UpdatedBy { get; set; }
    public byte[] RowVersion { get; set; }
}
