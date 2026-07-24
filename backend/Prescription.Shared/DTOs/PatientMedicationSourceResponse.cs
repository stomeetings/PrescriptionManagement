namespace Prescription.Shared.DTOs;

// Mirrors MedicineFormResponse's {Code, DisplayText} shape. MANUAL_ENTRY/PRESCRIPTION/IMPORTED.
public class PatientMedicationSourceResponse
{
    public string Code { get; set; }
    public string DisplayText { get; set; }
}
