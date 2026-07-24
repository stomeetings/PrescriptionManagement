namespace Prescription.Shared.DTOs;

public class MedicineFilterRequest
{
    public string? MedicineFormCode { get; set; }

    public string? MedicineRouteCode { get; set; }

    public string? Status { get; set; }

    public bool? IsControlledDrug { get; set; }
}
