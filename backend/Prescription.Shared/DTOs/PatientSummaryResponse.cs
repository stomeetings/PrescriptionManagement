namespace Prescription.Shared.DTOs;

// Minimal reference shape - not used by the list/search endpoint itself (see
// PatientListResponse for that). Intended for other modules that need to reference
// "which patient" without the full list/detail shape (e.g. a future Prescription
// module's patient picker). Mirrors UserSummaryResponse's identical purpose.
public class PatientSummaryResponse
{
    public int PatientId { get; set; }
    public string PatientNumber { get; set; }
    public string FullName { get; set; }
}
