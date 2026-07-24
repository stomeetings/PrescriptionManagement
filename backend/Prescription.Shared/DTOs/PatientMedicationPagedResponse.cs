namespace Prescription.Shared.DTOs;

// Mirrors MedicinePagedResponse/PatientPagedResponse's identical envelope shape - the
// project's existing paginated-list response wrapper being reused, not a new design.
public class PatientMedicationPagedResponse
{
    public IEnumerable<PatientMedicationSummaryResponse> Items { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int TotalCount { get; set; }
    public int TotalPages { get; set; }
}
