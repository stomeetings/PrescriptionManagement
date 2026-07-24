using System.ComponentModel.DataAnnotations;

namespace Prescription.Shared.DTOs;

// No new medication field values here (Dose/Frequency/etc.) - the caller must already
// have saved those via the existing PUT /api/patientmedications/{id} before calling this
// endpoint. This endpoint re-reads the now-current PatientMedication itself and diffs it
// against the existing active PrescriptionItem's own snapshot to decide what changed.
public class AmendPrescriptionItemRequest
{
    [Required]
    public int PatientMedicationId { get; set; }

    [Required]
    [StringLength(500, MinimumLength = 1)]
    public string Reason { get; set; }
}
