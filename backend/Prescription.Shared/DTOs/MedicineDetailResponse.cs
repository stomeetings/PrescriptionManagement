namespace Prescription.Shared.DTOs;

// Full detail - View Medicine Details and the Edit Medicine form (business spec
// section 5.6). Carries RowVersion, required on the next Update call for optimistic
// concurrency.
public class MedicineDetailResponse
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
    public string? ATCCode { get; set; }
    public bool IsControlledDrug { get; set; }
    public bool IsActive { get; set; }
    public string? Notes { get; set; }
    public DateTime CreatedDate { get; set; }
    public string CreatedBy { get; set; }
    public DateTime? UpdatedDate { get; set; }
    public string? UpdatedBy { get; set; }
    public byte[] RowVersion { get; set; }
}
