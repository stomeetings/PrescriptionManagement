namespace Prescription.Shared.DTOs;

// Mirrors RoleResponse's shape exactly (Code, DisplayText) - kept as its own DTO rather
// than reusing RoleResponse or LookupValueResponse, matching the project's existing
// precedent of one response shape per API contract even when structurally identical
// (RoleResponse itself was not reused from LookupValueResponse for the same reason).
public class GenderResponse
{
    public string Code { get; set; }
    public string DisplayText { get; set; }
}
