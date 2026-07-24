namespace Prescription.Domain.Entities;

// New dedicated lookup table entity (ACTIVE/STOPPED), matching every other lookup
// entity's flat shape (Gender, MedicineForm, etc.). Not created in Step 4 (which only
// covered PatientMedication/PatientMedicationHistory per that step's literal scope) -
// added now because this repository step genuinely needs a strongly-typed model for the
// PatientMedicationStatus data the stored procedures return, and every other lookup
// table in this project already has one.
public class PatientMedicationStatus
{
    public int PatientMedicationStatusId { get; set; }
    public string Code { get; set; }
    public string DisplayText { get; set; }
    public int DisplayOrder { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedDate { get; set; }
    public string CreatedBy { get; set; }
    public DateTime? UpdatedDate { get; set; }
    public string UpdatedBy { get; set; }
    public bool IsDeleted { get; set; }
}
