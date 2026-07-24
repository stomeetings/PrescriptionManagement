using System.ComponentModel.DataAnnotations;

namespace Prescription.Shared.DTOs;

// Inherits MedicineFormCode/MedicineRouteCode/Status/IsControlledDrug from
// MedicineFilterRequest rather than duplicating them, while keeping [FromQuery]-style
// binding flat - mirrors PatientSearchRequest/PatientFilterRequest's precedent exactly.
public class MedicineSearchRequest : MedicineFilterRequest
{
    public string? SearchTerm { get; set; }

    [Range(1, int.MaxValue)]
    public int Page { get; set; } = 1;

    [Range(1, 100)]
    public int PageSize { get; set; } = 20;

    public string SortBy { get; set; } = "createdDate";

    public string SortDirection { get; set; } = "desc";
}
