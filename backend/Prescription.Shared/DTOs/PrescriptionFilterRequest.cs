namespace Prescription.Shared.DTOs;

// Mirrors PatientFilterRequest's identical role. ProviderUserAccountId/PatientId are
// plain numeric-id filters, not backed by a dropdown here - Patients are searchable by
// every role via the existing GET /api/patients, but a Provider picker would need
// GET /api/users, which is Administrator-only (UsersController's class-level
// [Authorize(Roles = SYSTEM_ADMINISTRATOR)]) and would 403 for Doctor/Pharmacist/
// Receptionist. Rather than build a role-restricted dropdown that breaks for most users,
// or a net-new "list providers" endpoint beyond this feature's own scope, Provider Name
// free-text search (SearchTerm) covers that filter's practical use case;
// ProviderUserAccountId stays available for a future deep-link/picker once one exists.
public class PrescriptionFilterRequest
{
    public string? StatusCode { get; set; }
    public DateTime? IssueDateFrom { get; set; }
    public DateTime? IssueDateTo { get; set; }
    public DateTime? ExpiryDateFrom { get; set; }
    public DateTime? ExpiryDateTo { get; set; }
    public int? PatientId { get; set; }
    public int? ProviderUserAccountId { get; set; }
}
