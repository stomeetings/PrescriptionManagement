namespace Prescription.Shared.DTOs;

// Full read-only view for the Prescription Details page - GET /api/prescriptions/{id}.
// Reuses PrescriptionProviderResponse (Step 18.2) for the Provider section rather than
// inventing a near-duplicate shape. No NZMCNumber/PracticeName on Provider - UserAccount
// has no such columns (only Patient has an unrelated NZMCNumber column);
// PrescriptionProviderResponse already omits them for the same reason. No separate
// "Additional Instructions" field - this schema has no such column distinct from
// ClinicalNotes (prescription-level) and each medication's own Instructions (already in
// Medications, the Medication Grid's "Directions" column). Medications uses its own
// dedicated PrescriptionDetailMedicationResponse (not the Step 18.7 Version-comparison
// type) since Prescription Item Amendment & Replacement's ItemStatus/Scid/Replacement*
// fields don't apply to that unrelated feature.
public class PrescriptionDetailsResponse
{
    public int PrescriptionId { get; set; }
    public string PrescriptionNumber { get; set; }
    public PrescriptionStatusResponse Status { get; set; }
    public int? VersionNumber { get; set; }
    public DateTime IssueDate { get; set; }
    public DateTime? ExpiryDate { get; set; }
    public int MedicationCount { get; set; }

    // Total reprints so far (derived - COUNT of PrescriptionPrintHistory, same "no
    // redundant stored counter" philosophy as PDF DownloadCount). Doubles as the
    // ReprintDialog's own "Previous Print Count" display when it fetches this same
    // endpoint on open.
    public int PrintCount { get; set; }
    public string? ClinicalNotes { get; set; }
    public string CreatedBy { get; set; }
    public DateTime CreatedDate { get; set; }
    public string? UpdatedBy { get; set; }
    public DateTime? UpdatedDate { get; set; }
    public DateTime? FinalizedDate { get; set; }
    public string? FinalizedBy { get; set; }
    public byte[] RowVersion { get; set; }

    // The exact rendered document, same as every other Xhtml field in this module -
    // needed for the Details page's own Preview/Print actions (PrescriptionPreviewFrame
    // reused directly, no HTML regenerated in React).
    public string Xhtml { get; set; }

    public PrescriptionPatientSummaryResponse Patient { get; set; }
    public PrescriptionProviderResponse Provider { get; set; }
    public List<PrescriptionDetailMedicationResponse> Medications { get; set; } = new();
    public List<PrescriptionTimelineEventResponse> Timeline { get; set; } = new();
}
