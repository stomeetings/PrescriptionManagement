namespace Prescription.Shared.DTOs;

// The GET /api/prescriptions / POST /api/prescriptions/search envelope - mirrors
// PatientPagedResponse's identical pagination-metadata reasoning.
public class PrescriptionPagedResponse
{
    public IEnumerable<PrescriptionListResponse> Items { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int TotalCount { get; set; }
    public int TotalPages { get; set; }
}
