using Prescription.Application.Repositories;

namespace Prescription.Application.Services;

public class PatientMedicationPrescriptionService : IPatientMedicationPrescriptionService
{
    private readonly IPatientMedicationPrescriptionRepository _repository;

    public PatientMedicationPrescriptionService(IPatientMedicationPrescriptionRepository repository)
    {
        _repository = repository;
    }

    public async Task<PatientMedicationPrescriptionSummary> GetByPatientMedicationAsync(int patientMedicationId)
    {
        var history = (await _repository.GetByPatientMedicationAsync(patientMedicationId)).ToList();

        // The chain is monotonic (each replacement happens strictly after the one it
        // replaces), so at most one entry has ItemStatus == "ACTIVE" at any time - the
        // system's own invariant, not re-derived here. "Last" is simply the most
        // recently linked entry regardless of status (History is already
        // chronological), which normally coincides with the active one but wouldn't for
        // a medication whose whole chain has since been stopped/superseded with no
        // successor.
        var currentActive = history.FirstOrDefault(entry => entry.ItemStatus == "ACTIVE");
        var last = history.LastOrDefault();

        return new PatientMedicationPrescriptionSummary
        {
            History = history,
            CurrentActivePrescriptionNumber = currentActive?.PrescriptionNumber,
            LastPrescriptionNumber = last?.PrescriptionNumber,
            ReplacementCount = history.Count(entry => entry.RelationshipType == "REPLACEMENT"),
            PrintCount = history.Sum(entry => entry.PrintCount)
        };
    }

    public Task<IEnumerable<OriginatingPatientMedicationEntry>> GetByPrescriptionAsync(int prescriptionId)
        => _repository.GetByPrescriptionAsync(prescriptionId);
}
