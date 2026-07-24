namespace Prescription.Shared.DTOs;

// Named MedicationFilterRequest/MedicationSearchRequest (see the sibling class), not
// "PatientMedicationSearchRequest" as this step's task literally named it - api-spec.md
// section 5 (already approved) splits this into a Filter/Search pair, mirroring
// MedicineFilterRequest/MedicineSearchRequest's existing precedent exactly.
public class MedicationFilterRequest
{
    public int? PatientId { get; set; }

    public string? StatusCode { get; set; }

    public bool? IsPrn { get; set; }

    public DateTime? StartDateFrom { get; set; }

    public DateTime? StartDateTo { get; set; }

    public DateTime? EndDateFrom { get; set; }

    public DateTime? EndDateTo { get; set; }
}
