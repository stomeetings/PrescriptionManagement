using System.ComponentModel.DataAnnotations;

namespace Prescription.Shared.DTOs;

public class MedicationSearchRequest : MedicationFilterRequest
{
    public string? SearchTerm { get; set; }

    [Range(1, int.MaxValue)]
    public int Page { get; set; } = 1;

    [Range(1, 100)]
    public int PageSize { get; set; } = 20;

    public string SortBy { get; set; } = "createdDate";

    public string SortDirection { get; set; } = "desc";
}
