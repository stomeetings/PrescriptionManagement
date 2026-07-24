namespace Prescription.Domain.Entities;

/// <summary>
/// A medicine catalog entry (master/reference data - database-spec.md section 1). Not
/// owned by any Patient; referenced later by the future Prescription/PrescriptionItem
/// table via MedicineId. MedicineFormId/MedicineRouteId reuse the existing MedicineForm/
/// MedicineRoute lookup tables - named to match those tables exactly, not the
/// "DosageFormId"/"RouteId" naming used informally in the business/API specs.
/// </summary>
public class Medicine
{
    public int MedicineId { get; set; }
    public string MedicineCode { get; set; }
    public string MedicineName { get; set; }
    public string GenericName { get; set; }
    public string BrandName { get; set; }
    public string Strength { get; set; }
    public int MedicineFormId { get; set; }
    public int MedicineRouteId { get; set; }
    public string Manufacturer { get; set; }

    /// <summary>WHO Anatomical Therapeutic Chemical classification code, when known.</summary>
    public string ATCCode { get; set; }

    /// <summary>
    /// Flags scheduled/controlled substances for future Prescription/Dispensing workflow
    /// rules (extra authorization, reporting) - this entity only carries the flag.
    /// </summary>
    public bool IsControlledDrug { get; set; }

    public bool IsActive { get; set; }
    public string Notes { get; set; }
    public byte[] RowVersion { get; set; }
    public DateTime CreatedDate { get; set; }
    public string CreatedBy { get; set; }
    public DateTime? UpdatedDate { get; set; }
    public string UpdatedBy { get; set; }
    public bool IsDeleted { get; set; }
}
