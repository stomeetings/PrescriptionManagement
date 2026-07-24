using Prescription.Application.Repositories;

namespace Prescription.Application.Services;

public interface IPatientMedicationPrescriptionService
{
    Task<PatientMedicationPrescriptionSummary> GetByPatientMedicationAsync(int patientMedicationId);

    Task<IEnumerable<OriginatingPatientMedicationEntry>> GetByPrescriptionAsync(int prescriptionId);
}
