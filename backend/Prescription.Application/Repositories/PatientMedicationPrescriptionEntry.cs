namespace Prescription.Application.Repositories;

// One row of usp_PatientMedicationPrescription_GetByPatientMedication - one prescription
// this Patient Medication has ever been linked to (Original creation, or a Replacement
// from the Amendment & Replacement workflow).
public class PatientMedicationPrescriptionEntry
{
    public int PatientMedicationPrescriptionId { get; set; }
    public int PrescriptionId { get; set; }
    public string PrescriptionNumber { get; set; }
    public int PrescriptionItemId { get; set; }
    public string Scid { get; set; }
    public string RelationshipType { get; set; }
    public string LinkedBy { get; set; }
    public DateTime LinkedDate { get; set; }
    public DateTime IssueDate { get; set; }
    public string StatusCode { get; set; }
    public string StatusDisplayText { get; set; }
    public string ItemStatus { get; set; }
    public int PrintCount { get; set; }
}
