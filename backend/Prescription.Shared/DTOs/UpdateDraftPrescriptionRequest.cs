using System.ComponentModel.DataAnnotations;

namespace Prescription.Shared.DTOs;

// The minimal real Edit this step actually needs (not the full Prescription Editor UI) -
// PrescriptionId comes from the route, not the body. Same no-client-supplied-provider
// reasoning as SaveDraftPrescriptionRequest - the prescribing clinician never changes on
// an edit, so this request doesn't carry one at all.
public class UpdateDraftPrescriptionRequest
{
    [Required]
    public string Xhtml { get; set; }

    [Required]
    [MinLength(1)]
    public int[] SelectedPatientMedicationIds { get; set; }

    public string? ClinicalNotes { get; set; }

    // Base64-encoded automatically by System.Text.Json for a byte[] property. A stale
    // value results in a 409 Conflict, not a validation error - matches every other
    // Update request's identical RowVersion convention in this project.
    [Required]
    public byte[] RowVersion { get; set; }
}
