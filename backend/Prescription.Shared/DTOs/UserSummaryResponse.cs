namespace Prescription.Shared.DTOs;

// Minimal reference shape - not used by the list/search endpoint itself (see
// UserListResponse for that). Intended for other modules that need to reference "which
// user" without the full list/detail shape (e.g. a future "assigned to" dropdown).
public class UserSummaryResponse
{
    public int UserAccountId { get; set; }
    public string FullName { get; set; }
    public string Username { get; set; }
    public RoleResponse Role { get; set; }
}
