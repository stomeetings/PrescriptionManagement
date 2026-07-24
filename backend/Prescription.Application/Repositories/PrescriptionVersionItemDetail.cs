namespace Prescription.Application.Repositories;

// Mirrors dbo.PrescriptionVersionItem's own snapshot shape - one line item within a
// PrescriptionVersionDetail, and also the unit compared by PrescriptionVersionService's
// Compare diff (matched by MedicineId).
public class PrescriptionVersionItemDetail
{
    public int PrescriptionVersionItemId { get; set; }
    public int MedicineId { get; set; }
    public string MedicineNameSnapshot { get; set; }
    public string GenericNameSnapshot { get; set; }
    public string StrengthSnapshot { get; set; }
    public string DosageFormSnapshot { get; set; }
    public string RouteSnapshot { get; set; }
    public decimal Dose { get; set; }
    public int DoseUnitId { get; set; }
    public string DoseUnitSnapshot { get; set; }
    public int FrequencyId { get; set; }
    public string FrequencySnapshot { get; set; }
    public int Duration { get; set; }
    public int DurationUnitId { get; set; }
    public string DurationUnitSnapshot { get; set; }
    public decimal Quantity { get; set; }
    public string Instructions { get; set; }
    public bool PRN { get; set; }
}
