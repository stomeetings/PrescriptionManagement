using Prescription.Domain.Entities;

namespace Prescription.Application.Repositories;

// Not a DTO (no presentation formatting) and not a Domain entity itself - a plain,
// named container composing the entities one row of usp_PatientMedication_GetAll/
// GetCurrent/GetHistory/Search actually joins together. Introduced instead of a
// positional tuple (the pattern PatientRepository/MedicineRepository use) purely
// because this module joins far more lookup tables per row (five) than either of
// those - an 8-9 element positional ValueTuple would hurt readability more than a
// named type costs in extra ceremony. Not a generic/reusable abstraction; scoped to
// this module's own repository return shape only.
public class PatientMedicationRecord
{
    public PatientMedication PatientMedication { get; set; }
    public Patient Patient { get; set; }

    // Gap-fill added during Step 10 (Controllers/Mapping): the underlying stored
    // procedures select a pre-concatenated "FirstName + ' ' + LastName" column (Patient
    // itself only carries PatientId/PatientNumber here - see Patient's own remarks) with
    // nowhere to land until now. Response DTOs need a display name; this is that value.
    public string PatientFullName { get; set; }
    public Medicine Medicine { get; set; }
    public MedicineForm MedicineForm { get; set; }
    public MedicineRoute MedicineRoute { get; set; }
    public DoseUnit DoseUnit { get; set; }
    public Frequency Frequency { get; set; }
    public DurationUnit DurationUnit { get; set; }
    public PatientMedicationStatus Status { get; set; }

    // NEVER_PRESCRIBED/CURRENTLY_PRESCRIBED/SUPERSEDED - only populated by
    // usp_PatientMedication_GetCurrent (see that procedure's own comment); null from
    // GetAll/GetHistory/Search, a deliberate scope trim.
    public string? PrescriptionLinkStatus { get; set; }
}
