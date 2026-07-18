using System.ComponentModel.DataAnnotations;

namespace Prescription.Shared.DTOs;

// Inherits RoleCode/Status from UserFilterRequest rather than duplicating them, while
// keeping [FromQuery] binding flat (?searchTerm=...&roleCode=...&status=...) instead
// of a nested object requiring dot-notation query keys.
public class UserSearchRequest : UserFilterRequest
{
    public string? SearchTerm { get; set; }

    [Range(1, int.MaxValue)]
    public int Page { get; set; } = 1;

    [Range(1, 100)]
    public int PageSize { get; set; } = 20;

    public string SortBy { get; set; } = "createdDate";

    public string SortDirection { get; set; } = "desc";
}
