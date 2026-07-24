namespace Prescription.Shared.DTOs;

// Named GeneratePrescriptionResponse, not "GeneratePrescriptionDraftResponse" as this
// step's task literally named it (matches GeneratePrescriptionRequest's identical
// reconciliation). No DoctorId/DoctorName fields, despite this step's task listing them
// under "Header": neither the approved api-spec.md section 6, the business spec, nor
// GeneratePrescriptionRequest (which has no doctorId input at all) carry a single
// top-level "doctor" concept for the whole draft - each individual medication has its
// own independent, optional PrescribedBy (see PatientMedicationDetailResponse). Adding
// an unbacked DoctorId/DoctorName pair here would fabricate data no caller actually
// supplies. DraftPrescriptionId is a transient correlation identifier generated fresh on
// each call, not a persisted database key - no Prescription table exists yet for this to
// reference (api-spec.md section 6).
public class GeneratePrescriptionResponse
{
    public Guid DraftPrescriptionId { get; set; }
    public PatientSummaryResponse Patient { get; set; }
    public IEnumerable<PatientMedicationSummaryResponse> SelectedMedicines { get; set; }
    public IEnumerable<string> ValidationMessages { get; set; }

    // Added for Step 18.2 (Prescription Preview Dialog) - the complete, self-contained
    // XHTML document rendered by IPrescriptionHtmlGenerator (Step 18.1). The frontend
    // only ever displays this string; it must never generate its own HTML.
    public string Xhtml { get; set; }

    // Added for Step 18.2 - the prescribing clinician, so the Preview dialog's toolbar
    // can show a Provider Name without a second API round trip.
    public PrescriptionProviderResponse Provider { get; set; }

    // Added for Step 18.2 - PrescriptionToolbar's info bar needs these as discrete
    // fields, not just embedded inside Xhtml's rendered markup. Same source of truth as
    // the template (PrescriptionTemplateMappingExtensions.BuildPrescriptionTemplateModel)
    // - a placeholder, not a persisted value, since nothing is saved yet (see
    // docs/prescriptions/prescription-management.md section 5.1).
    public string PrescriptionNumber { get; set; }
    public DateTime IssueDate { get; set; }
    public string Status { get; set; }
}
