namespace Prescription.Shared.DTOs;

public class CurrentUserResponse
{
    public int UserAccountId { get; set; }
    public string Username { get; set; }
    public string FullName { get; set; }
    public RoleResponse Role { get; set; }
}
