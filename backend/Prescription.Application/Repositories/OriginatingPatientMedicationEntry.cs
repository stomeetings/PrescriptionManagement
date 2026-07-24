namespace Prescription.Application.Repositories;

// One row of usp_PatientMedicationPrescription_GetByPrescription - the Patient
// Medication a given Prescription's item was created from (Prescription Details' new
// "Originating Patient Medication" display).
public class OriginatingPatientMedicationEntry
{
    public int PatientMedicationId { get; set; }
    public string MedicineName { get; set; }
    public string RelationshipType { get; set; }
    public string Scid { get; set; }
    public bool IsCurrent { get; set; }
    public bool PatientMedicationIsActive { get; set; }
}
