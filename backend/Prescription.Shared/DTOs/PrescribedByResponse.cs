namespace Prescription.Shared.DTOs;

// api-spec.md section 6 specifies prescribedBy as a minimal {userAccountId, fullName}
// shape - leaner than UserSummaryResponse (which also carries Username/Role), so this is
// its own dedicated DTO rather than a reuse.
public class PrescribedByResponse
{
    public int UserAccountId { get; set; }
    public string FullName { get; set; }
}
