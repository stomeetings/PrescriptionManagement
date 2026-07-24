using System.ComponentModel.DataAnnotations;

namespace Prescription.Shared.DTOs;

// No ProviderId/ProviderUserAccountId field, despite this step's task literally naming
// one - the prescribing clinician is the authenticated caller (docs/prescriptions/
// prescription-management.md section 15 item 5), resolved server-side from the JWT,
// exactly like GeneratePrescriptionDraft already does. Accepting a client-supplied
// provider id would let any caller claim to be prescribing as someone else - a real
// security concern, not just a naming variant, so this is not silently accepted as
// requested.
public class SaveDraftPrescriptionRequest
{
    [Required]
    public Guid DraftPrescriptionId { get; set; }

    [Required]
    public int PatientId { get; set; }

    [Required]
    public string Xhtml { get; set; }

    [Required]
    [MinLength(1)]
    public int[] SelectedPatientMedicationIds { get; set; }

    public string? ClinicalNotes { get; set; }
}
