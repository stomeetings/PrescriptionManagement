using System.ComponentModel.DataAnnotations;

namespace Prescription.Shared.DTOs;

public class LoginRequest
{
    [Required]
    [MaxLength(100)]
    public string Username { get; set; }

    [Required]
    [MaxLength(100)]
    public string Password { get; set; }
}
