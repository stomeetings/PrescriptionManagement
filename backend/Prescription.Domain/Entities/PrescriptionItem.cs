namespace Prescription.Domain.Entities;

/// <summary>
/// One prescribed medicine line (database-spec.md section 3.2). Every catalog/lookup-
/// derived display value is snapshotted as plain text (the *Snapshot properties), in
/// addition to keeping its FK - a later correction to Medicine/DoseUnit/Frequency/
/// DurationUnit catalog data must never retroactively change how an already-saved
/// Prescription displays. Immutable once written - no UpdatedDate/UpdatedBy/IsDeleted.
/// </summary>
public class PrescriptionItem
{
    public int PrescriptionItemId { get; set; }
    public int PrescriptionId { get; set; }

    /// <summary>FK to the source Patient Medication this line was drafted from, if any. Nullable - a future medicine added directly from the Medicine Master would have none.</summary>
    public int? PatientMedicationId { get; set; }

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
    public DateTime CreatedDate { get; set; }
    public string CreatedBy { get; set; }
}
