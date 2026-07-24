using Prescription.Application.Repositories;

namespace Prescription.Application.Prescriptions.Versioning;

// Built by PrescriptionVersionService.CompareAsync - comparison is presentation logic
// computed in the Application layer from two PrescriptionVersionDetail snapshots, not a
// dedicated SQL stored procedure (no business logic in the Repository/SP layer).
// Medications are matched by MedicineId, mirroring usp_Prescription_UpdateDraft's own
// change-detection identity rule.
public class PrescriptionVersionComparisonResult
{
    public int PrescriptionId { get; set; }
    public int FromVersionNumber { get; set; }
    public int ToVersionNumber { get; set; }
    public string FromClinicalNotes { get; set; }
    public string ToClinicalNotes { get; set; }
    public bool ClinicalNotesChanged { get; set; }
    public List<PrescriptionVersionItemDetail> MedicationsAdded { get; set; } = new();
    public List<PrescriptionVersionItemDetail> MedicationsRemoved { get; set; } = new();
    public List<PrescriptionVersionItemChange> MedicationsChanged { get; set; } = new();
    public List<PrescriptionVersionItemDetail> MedicationsUnchanged { get; set; } = new();
}
