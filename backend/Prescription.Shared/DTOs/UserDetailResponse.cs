namespace Prescription.Shared.DTOs;

// Full detail - View User Details and the Edit User form (business spec section 5.6).
// Carries RowVersion, required on the next Update call for optimistic concurrency.
public class UserDetailResponse
{
    public int UserAccountId { get; set; }
    public string FirstName { get; set; }
    public string LastName { get; set; }
    public string FullName { get; set; }
    public string Username { get; set; }
    public string Email { get; set; }
    public string? PhoneNumber { get; set; }
    public RoleResponse Role { get; set; }
    public bool IsActive { get; set; }
    public DateTime? LastLoginDate { get; set; }
    public DateTime CreatedDate { get; set; }
    public string CreatedBy { get; set; }
    public DateTime? UpdatedDate { get; set; }
    public string? UpdatedBy { get; set; }
    public byte[] RowVersion { get; set; }
}
