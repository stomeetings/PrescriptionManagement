namespace Prescription.Shared.DTOs;

// Mirrors GenderResponse/RoleResponse's {Code, DisplayText} shape - kept as its own DTO
// per this project's established one-shape-per-context precedent.
public class MedicineFormResponse
{
    public string Code { get; set; }
    public string DisplayText { get; set; }
}
