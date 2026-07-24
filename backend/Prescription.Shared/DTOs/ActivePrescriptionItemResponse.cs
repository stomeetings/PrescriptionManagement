namespace Prescription.Shared.DTOs;

// GET /api/prescriptions/items/{patientMedicationId}/active - lets the frontend's Edit
// Patient Medication form decide whether to show the amendment warning dialog before
// Save. HasActivePrescriptionItem=false (with every other field null) is a normal,
// expected result - not an error - for a medication that was never prescribed, or whose
// prescription was never finalized.
public class ActivePrescriptionItemResponse
{
    public bool HasActivePrescriptionItem { get; set; }
    public string PrescriptionNumber { get; set; }
}
