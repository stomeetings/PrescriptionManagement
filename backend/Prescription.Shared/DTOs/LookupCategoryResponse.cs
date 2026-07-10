namespace Prescription.Shared.DTOs;

public class LookupCategoryResponse
{
    public string Code { get; set; }
    public string Name { get; set; }
    public IEnumerable<LookupValueResponse> Values { get; set; }
}
