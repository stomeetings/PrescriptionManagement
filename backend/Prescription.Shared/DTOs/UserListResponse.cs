namespace Prescription.Shared.DTOs;

// One row in the View/Search Users list - matches business spec section 5.1's column
// list exactly (Full Name, Username, Email, Phone Number, Role, Status, Last Login,
// Created Date).
public class UserListResponse
{
    public int UserAccountId { get; set; }
    public string Username { get; set; }
    public string FullName { get; set; }
    public string Email { get; set; }
    public string? PhoneNumber { get; set; }
    public RoleResponse Role { get; set; }
    public bool IsActive { get; set; }
    public DateTime? LastLoginDate { get; set; }
    public DateTime CreatedDate { get; set; }
}
