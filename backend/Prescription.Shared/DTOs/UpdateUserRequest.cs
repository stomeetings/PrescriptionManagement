using System.ComponentModel.DataAnnotations;

namespace Prescription.Shared.DTOs;

public class UpdateUserRequest
{
    [Required]
    [StringLength(100)]
    public string FirstName { get; set; }

    [Required]
    [StringLength(100)]
    public string LastName { get; set; }

    [Required]
    [EmailAddress]
    [StringLength(256)]
    public string Email { get; set; }

    [Phone]
    [StringLength(20)]
    public string? PhoneNumber { get; set; }

    [Required]
    public string RoleCode { get; set; }

    [Required]
    public bool IsActive { get; set; }

    // Base64-encoded automatically by System.Text.Json for a byte[] property - no
    // custom (de)serialization needed. Required for optimistic concurrency; a stale
    // value results in a 409 Conflict, not a validation error.
    [Required]
    public byte[] RowVersion { get; set; }
}
