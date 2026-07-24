using System.ComponentModel.DataAnnotations;

namespace Prescription.Shared.DTOs;

// Mirrors PatientSearchRequest's identical role - inherits the structured filters from
// PrescriptionFilterRequest rather than duplicating them.
public class PrescriptionSearchRequest : PrescriptionFilterRequest
{
    public string? SearchTerm { get; set; }

    [Range(1, int.MaxValue)]
    public int Page { get; set; } = 1;

    [Range(1, 100)]
    public int PageSize { get; set; } = 20;

    public string SortBy { get; set; } = "createdDate";

    public string SortDirection { get; set; } = "desc";
}
