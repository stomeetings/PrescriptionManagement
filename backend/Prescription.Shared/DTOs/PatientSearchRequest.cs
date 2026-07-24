using System.ComponentModel.DataAnnotations;

namespace Prescription.Shared.DTOs;

// Inherits Status/GenderCode from PatientFilterRequest rather than duplicating them,
// while keeping [FromQuery]-style binding flat, matching UserSearchRequest/
// UserFilterRequest's precedent exactly.
public class PatientSearchRequest : PatientFilterRequest
{
    public string? SearchTerm { get; set; }

    // Discrete fields for the Prescription module's Patient Search/Selection dialog
    // ("New Prescription" must only ever pick an existing patient, never create one -
    // this dialog offers NHI/First Name/Last Name/Date of Birth as separate, independently
    // combinable filters, unlike the Patient List page's single free-text SearchTerm box).
    // All four are optional and AND-combined with each other and with
    // SearchTerm/Status/GenderCode when supplied - none of this changes SearchTerm's own
    // existing behavior for the Patient List page.
    public string? Nhi { get; set; }
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
    public DateTime? DateOfBirth { get; set; }

    [Range(1, int.MaxValue)]
    public int Page { get; set; } = 1;

    [Range(1, 100)]
    public int PageSize { get; set; } = 20;

    public string SortBy { get; set; } = "createdDate";

    public string SortDirection { get; set; } = "desc";
}
