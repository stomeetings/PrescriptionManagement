using System.ComponentModel.DataAnnotations;

namespace Prescription.Shared.DTOs;

// Named GeneratePrescriptionRequest, not "GeneratePrescriptionDraftRequest" as this
// step's task literally named it - api-spec.md section 5 (already approved) uses this
// exact name.
public class GeneratePrescriptionRequest
{
    [Required]
    public int PatientId { get; set; }

    [Required]
    [MinLength(1)]
    public int[] SelectedPatientMedicationIds { get; set; }

    public string? ClinicalNotes { get; set; }
}
