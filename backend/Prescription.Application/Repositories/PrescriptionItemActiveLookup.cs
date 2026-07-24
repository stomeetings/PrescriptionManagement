namespace Prescription.Application.Repositories;

// Returned by usp_PrescriptionItem_FindActiveByPatientMedication - "Find ACTIVE
// finalized Prescription Item" (this feature's own workflow step). Null/absent means
// "Medication exists? No" - update the PatientMedication only, no Prescription changes.
public class PrescriptionItemActiveLookup
{
    public int PrescriptionItemId { get; set; }
    public int PrescriptionId { get; set; }
    public int MedicineId { get; set; }
    public decimal Dose { get; set; }
    public int DoseUnitId { get; set; }
    public int FrequencyId { get; set; }
    public int Duration { get; set; }
    public int DurationUnitId { get; set; }
    public decimal Quantity { get; set; }
    public string Instructions { get; set; }
    public bool PRN { get; set; }
    public string ItemStatus { get; set; }
    public string Scid { get; set; }
    public string PrescriptionNumber { get; set; }
    public int PatientId { get; set; }
    public int ProviderUserAccountId { get; set; }
    public string ClinicalNotes { get; set; }
    public string PrescriptionStatusCode { get; set; }
}
