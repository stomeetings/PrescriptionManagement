namespace Prescription.Shared.DTOs;

// Shared shape for a single medicine line, reused across the version detail response and
// the comparison response's Added/Removed/Changed/Unchanged lists.
public class PrescriptionVersionItemResponse
{
    public int MedicineId { get; set; }
    public string MedicineName { get; set; }
    public string GenericName { get; set; }
    public string Strength { get; set; }
    public string DosageForm { get; set; }
    public string Route { get; set; }
    public decimal Dose { get; set; }
    public string DoseUnit { get; set; }
    public string Frequency { get; set; }
    public int Duration { get; set; }
    public string DurationUnit { get; set; }
    public decimal Quantity { get; set; }
    public string Instructions { get; set; }
    public bool PRN { get; set; }
}
