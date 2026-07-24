namespace Prescription.Shared.DTOs;

// "+" = MedicationsAdded, "-" = MedicationsRemoved, "✏" = MedicationsChanged - the
// PrescriptionVersionComparison component renders these three lists (plus
// MedicationsUnchanged, shown without a badge) directly; no further diffing happens
// client-side.
public class PrescriptionVersionComparisonResponse
{
    public int PrescriptionId { get; set; }
    public int FromVersionNumber { get; set; }
    public int ToVersionNumber { get; set; }
    public string FromClinicalNotes { get; set; }
    public string ToClinicalNotes { get; set; }
    public bool ClinicalNotesChanged { get; set; }
    public List<PrescriptionVersionItemResponse> MedicationsAdded { get; set; } = new();
    public List<PrescriptionVersionItemResponse> MedicationsRemoved { get; set; } = new();
    public List<PrescriptionVersionItemChangeResponse> MedicationsChanged { get; set; } = new();
    public List<PrescriptionVersionItemResponse> MedicationsUnchanged { get; set; } = new();
}
