namespace Prescription.Shared.DTOs;

// This step's task literally asked for a HistoryId/Action/PreviousValues/NewValues/
// ChangedBy/ChangedDate shape - the raw PatientMedicationHistory audit-table row.
// api-spec.md section 6 (already approved) explicitly rules this out: "entries
// (PatientMedicationSummaryResponse[], ordered chronologically, including both Active
// and Stopped rows - not the raw PatientMedicationHistory JSON audit-log entries, see
// section 4.4)". The approved spec is followed here; the raw audit JSON is never
// surfaced through the API by design (see database-spec.md's PHI-sensitivity note on
// PreviousValues/NewValues).
public class PatientMedicationHistoryResponse
{
    public int PatientId { get; set; }
    public string PatientNumber { get; set; }
    public string PatientFullName { get; set; }
    public IEnumerable<PatientMedicationSummaryResponse> Entries { get; set; }
}
