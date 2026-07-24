namespace Prescription.Application.Repositories;

// One row of usp_Prescription_GetDetailsById's second result set (the Medication Grid) -
// mirrors dbo.PrescriptionItem's own snapshot shape. ItemStatus/Scid and the Replacement*
// fields were added by Prescription Item Amendment & Replacement (061/the
// PrescriptionItemReplacement LEFT JOIN) - PrescriptionItem is no longer a pure
// immutable snapshot with zero status (that was true before this feature).
public class PrescriptionDetailItem
{
    public int PrescriptionItemId { get; set; }
    public int MedicineId { get; set; }
    public string MedicineNameSnapshot { get; set; }
    public string GenericNameSnapshot { get; set; }
    public string StrengthSnapshot { get; set; }
    public string DosageFormSnapshot { get; set; }
    public string RouteSnapshot { get; set; }
    public decimal Dose { get; set; }
    public string DoseUnitSnapshot { get; set; }
    public string FrequencySnapshot { get; set; }
    public int Duration { get; set; }
    public string DurationUnitSnapshot { get; set; }
    public decimal Quantity { get; set; }
    public string Instructions { get; set; }
    public bool PRN { get; set; }
    public string ItemStatus { get; set; }
    public string Scid { get; set; }
    public string ReplacementPrescriptionNumber { get; set; }
    public string ReplacementScid { get; set; }
    public DateTime? ReplacementDate { get; set; }
}
