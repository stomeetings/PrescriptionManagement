namespace Prescription.Shared.DTOs;

// GET /api/patient-medications/{id}/prescriptions - the Prescription History section
// plus Medication Details' own derived summary fields (Current Active Prescription/
// Last Prescription/Replacement Count/Print Count), so both sections come from one call.
public class PatientMedicationPrescriptionHistoryResponse
{
    public List<PatientMedicationPrescriptionResponse> History { get; set; } = new();
    public string? CurrentActivePrescriptionNumber { get; set; }
    public string? LastPrescriptionNumber { get; set; }
    public int ReplacementCount { get; set; }
    public int PrintCount { get; set; }
}
