namespace Prescription.Application.Repositories;

// "Medication Details / Display: Current Active Prescription, Last Prescription,
// Replacement Count, Print Count" - all derived in PatientMedicationPrescriptionService
// from the same History list, not separate queries.
public class PatientMedicationPrescriptionSummary
{
    public IEnumerable<PatientMedicationPrescriptionEntry> History { get; set; } = Enumerable.Empty<PatientMedicationPrescriptionEntry>();
    public string? CurrentActivePrescriptionNumber { get; set; }
    public string? LastPrescriptionNumber { get; set; }
    public int ReplacementCount { get; set; }
    public int PrintCount { get; set; }
}
