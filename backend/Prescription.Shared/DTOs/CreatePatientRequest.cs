using System.ComponentModel.DataAnnotations;

namespace Prescription.Shared.DTOs;

public class CreatePatientRequest
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

    public bool IsActive { get; set; } = true;

    public string? Notes { get; set; }
}
