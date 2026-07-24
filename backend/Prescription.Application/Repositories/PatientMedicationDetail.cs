using Prescription.Domain.Entities;

namespace Prescription.Application.Repositories;

// The richer shape returned by GetByIdAsync - everything in PatientMedicationRecord,
// plus the Source lookup and the (nullable) prescribing UserAccount. Same reasoning as
// PatientMedicationRecord for why this is a named class, not a positional tuple.
public class PatientMedicationDetail
{
    public PatientMedication PatientMedication { get; set; }
    public Patient Patient { get; set; }

    // Same gap-fill as PatientMedicationRecord.PatientFullName - see its comment.
    public string PatientFullName { get; set; }
    public Medicine Medicine { get; set; }
    public MedicineForm MedicineForm { get; set; }
    public MedicineRoute MedicineRoute { get; set; }
    public DoseUnit DoseUnit { get; set; }
    public Frequency Frequency { get; set; }
    public DurationUnit DurationUnit { get; set; }
    public PatientMedicationStatus Status { get; set; }
    public PatientMedicationSource Source { get; set; }
    public UserAccount PrescribedBy { get; set; }
}
