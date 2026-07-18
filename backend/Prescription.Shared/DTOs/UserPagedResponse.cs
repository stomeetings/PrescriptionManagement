namespace Prescription.Shared.DTOs;

// The GET /api/users envelope - pagination metadata alongside the page of results.
// Not a contradiction of Authentication's "no response envelope" decision (see
// api-spec.md section 6): that decision was about not wrapping ordinary single-resource
// responses, and a paginated collection genuinely needs this metadata.
public class UserPagedResponse
{
    public IEnumerable<UserListResponse> Items { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int TotalCount { get; set; }
    public int TotalPages { get; set; }
}
