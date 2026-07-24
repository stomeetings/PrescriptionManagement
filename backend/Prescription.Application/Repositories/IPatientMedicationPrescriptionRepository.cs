namespace Prescription.Application.Repositories;

// Named per this feature's own explicit request - a dedicated repository, matching this
// module's established one-concern-per-repository precedent.
public interface IPatientMedicationPrescriptionRepository
{
    Task<IEnumerable<PatientMedicationPrescriptionEntry>> GetByPatientMedicationAsync(int patientMedicationId);

    Task<IEnumerable<OriginatingPatientMedicationEntry>> GetByPrescriptionAsync(int prescriptionId);
}
