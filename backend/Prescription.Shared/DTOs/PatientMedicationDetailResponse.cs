namespace Prescription.Shared.DTOs;

// Full detail - View Patient Medication Details and the Edit form. Everything in
// PatientMedicationSummaryResponse plus clinical/audit fields, per api-spec.md section 6.
public class PatientMedicationDetailResponse
{
    public int PatientMedicationId { get; set; }
    public int PatientId { get; set; }
    public string PatientNumber { get; set; }
    public string PatientFullName { get; set; }
    public int MedicineId { get; set; }
    public string MedicineCode { get; set; }
    public string MedicineName { get; set; }
    public string GenericName { get; set; }
    public string Strength { get; set; }
    public MedicineFormResponse DosageForm { get; set; }
    public MedicineRouteResponse Route { get; set; }
    public decimal Dose { get; set; }
    public DoseUnitResponse DoseUnit { get; set; }
    public FrequencyResponse Frequency { get; set; }
    public int Duration { get; set; }
    public DurationUnitResponse DurationUnit { get; set; }
    public decimal Quantity { get; set; }
    public bool PRN { get; set; }
    public DateTime StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public bool IsCurrent { get; set; }
    public bool IsActive { get; set; }
    public PatientMedicationStatusResponse Status { get; set; }
    public string Instructions { get; set; }
    public string? ClinicalNotes { get; set; }
    public PrescribedByResponse? PrescribedBy { get; set; }
    public PatientMedicationSourceResponse Source { get; set; }
    public int? ResumedFromPatientMedicationId { get; set; }
    public string CreatedBy { get; set; }
    public DateTime CreatedDate { get; set; }
    public string? UpdatedBy { get; set; }
    public DateTime? UpdatedDate { get; set; }
    public string? StoppedBy { get; set; }
    public DateTime? StoppedDate { get; set; }

    // Base64-encoded automatically by System.Text.Json - required on the next Update
    // call for optimistic concurrency, matching MedicineDetailResponse's precedent.
    public byte[] RowVersion { get; set; }
}
