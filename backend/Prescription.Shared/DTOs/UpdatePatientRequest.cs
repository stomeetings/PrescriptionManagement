using System.ComponentModel.DataAnnotations;

namespace Prescription.Shared.DTOs;

// PatientNumber and IsActive are deliberately absent - PatientNumber cannot be changed
// after creation (business spec section 4.5, database-spec.md section 7) and there is no
// property for a caller to supply one through; IsActive changes only through
// ActivatePatientRequest/DeactivatePatientRequest, matching usp_Patient_Update's own
// parameter list. Mirrors UpdateUserRequest's equivalent treatment of Username.
public class UpdatePatientRequest
{
    [Required]
    [StringLength(100)]
    public string FirstName { get; set; }

    [Required]
    [StringLength(100)]
    public string LastName { get; set; }

    [StringLength(100)]
    public string? PreferredName { get; set; }

    [Required]
    [DataType(DataType.Date)]
    public DateTime DateOfBirth { get; set; }

    [Required]
    public string GenderCode { get; set; }

    [Phone]
    [StringLength(20)]
    public string? MobileNumber { get; set; }

    [EmailAddress]
    [StringLength(256)]
    public string? Email { get; set; }

    [StringLength(200)]
    public string? AddressLine1 { get; set; }

    [StringLength(200)]
    public string? AddressLine2 { get; set; }

    [StringLength(100)]
    public string? City { get; set; }

    [StringLength(100)]
    public string? Region { get; set; }

    [StringLength(20)]
    public string? PostalCode { get; set; }

    [StringLength(100)]
    public string? Country { get; set; }

    [StringLength(20)]
    public string? NHINumber { get; set; }

    [StringLength(20)]
    public string? NZMCNumber { get; set; }

    public string? Notes { get; set; }

    // Base64-encoded automatically by System.Text.Json for a byte[] property - no
    // custom (de)serialization needed. Required for optimistic concurrency; a stale
    // value results in a 409 Conflict, not a validation error.
    [Required]
    public byte[] RowVersion { get; set; }
}
