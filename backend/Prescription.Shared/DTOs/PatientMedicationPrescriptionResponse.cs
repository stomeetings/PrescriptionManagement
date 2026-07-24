namespace Prescription.Shared.DTOs;

// One row of the Prescription History section - Patient Medication Details' own spec:
// Prescription Number/SCID/Issue Date/Status/Relationship/Item Status.
public class PatientMedicationPrescriptionResponse
{
    public int PrescriptionId { get; set; }
    public string PrescriptionNumber { get; set; }
    public string Scid { get; set; }
    public DateTime IssueDate { get; set; }
    public PrescriptionStatusResponse Status { get; set; }
    public string RelationshipType { get; set; }
    public string ItemStatus { get; set; }
    public string LinkedBy { get; set; }
    public DateTime LinkedDate { get; set; }
}
