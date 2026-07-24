namespace Prescription.Shared.DTOs;

// Mirrors PatientMedicationStatusResponse/MedicineFormResponse's established
// {Code, DisplayText} shape.
public class PrescriptionStatusResponse
{
    public string Code { get; set; }
    public string DisplayText { get; set; }
}
