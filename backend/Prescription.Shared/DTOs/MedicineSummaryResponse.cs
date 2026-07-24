namespace Prescription.Shared.DTOs;

// Minimal reference shape - not used by the list/search endpoint itself (see
// MedicineListResponse for that). Intended for other modules that need to reference
// "which medicine" without the full list/detail shape (e.g. a future Prescription
// module's medicine picker). Mirrors PatientSummaryResponse's identical purpose.
//
// Note: the approved api-spec.md originally had MedicineSummaryResponse double as the
// list row too, since that document named only three response DTOs. This step's own
// task explicitly names a separate MedicineListResponse as well, so that reconciliation
// is reversed here - Summary goes back to being the lean, minimal shape (matching
// Patient's actual four-DTO pattern), and MedicineListResponse (below) becomes the real
// list/search row.
public class MedicineSummaryResponse
{
    public int MedicineId { get; set; }
    public string MedicineCode { get; set; }
    public string MedicineName { get; set; }
    public string Strength { get; set; }
}
