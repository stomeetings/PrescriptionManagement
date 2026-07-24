namespace Prescription.Shared.DTOs;

// The GET /api/patients / POST /api/patients/search envelope - pagination metadata
// alongside the page of results. Mirrors UserPagedResponse's identical reasoning: this
// is not a contradiction of the project's "no response envelope" decision, since a
// paginated collection genuinely needs this metadata.
public class PatientPagedResponse
{
    public IEnumerable<PatientListResponse> Items { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int TotalCount { get; set; }
    public int TotalPages { get; set; }
}
