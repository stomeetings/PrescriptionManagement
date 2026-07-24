namespace Prescription.Shared.DTOs;

// Named StopMedicationRequest, not "StopPatientMedicationRequest" as this step's task
// literally named it - api-spec.md section 5 (already approved) uses this exact name;
// following the approved spec over the task's paraphrase, per this module's established
// reconciliation pattern. Intentionally empty - PatientMedicationId comes from the
// route and StoppedBy from the authenticated caller, mirroring
// DeactivateMedicineRequest's identical precedent.
public class StopMedicationRequest
{
}
