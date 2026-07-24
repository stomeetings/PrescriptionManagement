namespace Prescription.Shared.DTOs;

// The Prescription Details page's own medication line shape - a dedicated type, not a
// reuse of PrescriptionVersionItemResponse (Step 18.7), since that type is shared with
// the unrelated Version Comparison feature where ItemStatus/replacement fields don't
// apply and would be meaningless there. ItemStatus/Scid/Replacement* were added by
// Prescription Item Amendment & Replacement - ReplacementPrescriptionNumber/
// ReplacementScid/ReplacementDate are all null for an item that has never been
// superseded.
public class PrescriptionDetailMedicationResponse
{
    public int PrescriptionItemId { get; set; }
    public int MedicineId { get; set; }
    public string MedicineName { get; set; }
    public string GenericName { get; set; }
    public string Strength { get; set; }
    public string DosageForm { get; set; }
    public string Route { get; set; }
    public decimal Dose { get; set; }
    public string DoseUnit { get; set; }
    public string Frequency { get; set; }
    public int Duration { get; set; }
    public string DurationUnit { get; set; }
    public decimal Quantity { get; set; }
    public string Instructions { get; set; }
    public bool PRN { get; set; }
    public string ItemStatus { get; set; }
    public string Scid { get; set; }
    public string? ReplacementPrescriptionNumber { get; set; }
    public string? ReplacementScid { get; set; }
    public DateTime? ReplacementDate { get; set; }
}
