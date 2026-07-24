namespace Prescription.Shared.DTOs;

// The row shape for the list/search endpoints and PatientMedicationPagedResponse.Items
// (api-spec.md section 6: "doubles as the PatientMedicationPagedResponse row shape") -
// this module's approved spec never split a separate ListResponse out from Summary the
// way Medicine Management's did. IsCurrent/IsActive are included per this step's task
// even though api-spec.md's own Summary field list omits them (it only lists IsCurrent
// under Detail) - both are real, harmless-to-expose entity properties, so they are
// added here as an additive extension of the approved shape, not a contradiction of it.
public class PatientMedicationSummaryResponse
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

    // NEVER_PRESCRIBED/CURRENTLY_PRESCRIBED/SUPERSEDED - only populated when this record
    // came from GET /api/patients/{patientId}/medications (usp_PatientMedication_
    // GetCurrent); null from every other list/search endpoint that also returns this
    // same shape (Patient Medication and Prescription Synchronization's own deliberate
    // scope trim - see that stored procedure's comment).
    public string? PrescriptionLinkStatus { get; set; }
}
