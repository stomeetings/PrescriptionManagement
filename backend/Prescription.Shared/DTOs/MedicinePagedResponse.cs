namespace Prescription.Shared.DTOs;

// The GET /api/medicines / POST /api/medicines/search envelope - pagination metadata
// alongside the page of results. Mirrors PatientPagedResponse's identical reasoning:
// this is the project's existing paginated-list response wrapper being reused, not a
// new envelope design.
public class MedicinePagedResponse
{
    public IEnumerable<MedicineListResponse> Items { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int TotalCount { get; set; }
    public int TotalPages { get; set; }
}
