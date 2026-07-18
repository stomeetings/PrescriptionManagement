using System.ComponentModel.DataAnnotations;

namespace Prescription.Shared.DTOs;

public class CreateUserRequest
{
    [Required]
    [StringLength(100)]
    public string FirstName { get; set; }

    [Required]
    [StringLength(100)]
    public string LastName { get; set; }

    [Required]
    [StringLength(100)]
    public string Username { get; set; }

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
    [StringLength(100, MinimumLength = 8)]
    public string TemporaryPassword { get; set; }

    public bool IsActive { get; set; } = true;
}
