namespace Prescription.Shared.DTOs;

// One row in the View/Search Medicines list - matches business spec section 5.1's
// column list exactly (Medicine Code, Medicine Name, Generic Name, Brand Name,
// Strength, Dosage Form, Route, Manufacturer, Controlled Drug indicator, Status).
public class MedicineListResponse
{
    public int MedicineId { get; set; }
    public string MedicineCode { get; set; }
    public string MedicineName { get; set; }
    public string GenericName { get; set; }
    public string? BrandName { get; set; }
    public string Strength { get; set; }
    public MedicineFormResponse MedicineForm { get; set; }
    public MedicineRouteResponse MedicineRoute { get; set; }
    public string? Manufacturer { get; set; }
    public bool IsControlledDrug { get; set; }
    public bool IsActive { get; set; }
    public DateTime? UpdatedDate { get; set; }
}
