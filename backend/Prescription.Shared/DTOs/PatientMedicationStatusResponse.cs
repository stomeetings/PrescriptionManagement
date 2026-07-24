namespace Prescription.Shared.DTOs;

// Mirrors MedicineFormResponse's {Code, DisplayText} shape. ACTIVE/STOPPED.
public class PatientMedicationStatusResponse
{
    public string Code { get; set; }
    public string DisplayText { get; set; }
}
