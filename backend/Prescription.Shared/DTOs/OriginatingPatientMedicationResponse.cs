namespace Prescription.Shared.DTOs;

// GET /api/prescriptions/{id}/patient-medications - Prescription Details' own
// "Originating Patient Medication" display.
public class OriginatingPatientMedicationResponse
{
    public int PatientMedicationId { get; set; }
    public string MedicineName { get; set; }
    public string RelationshipType { get; set; }
    public string Scid { get; set; }
    public bool IsCurrent { get; set; }
    public bool IsActive { get; set; }
}
