namespace Prescription.Shared.DTOs;

// Mirrors MedicineFormResponse/GenderResponse's {Code, DisplayText} shape. Gap-fill for
// this step - no response DTO existed yet for DoseUnit despite the lookup table/
// repository already existing.
public class DoseUnitResponse
{
    public string Code { get; set; }
    public string DisplayText { get; set; }
}
