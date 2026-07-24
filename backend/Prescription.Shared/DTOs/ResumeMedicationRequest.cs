using System.ComponentModel.DataAnnotations;

namespace Prescription.Shared.DTOs;

// Named ResumeMedicationRequest, not "ResumePatientMedicationRequest" - matches
// api-spec.md section 5's approved name (see StopMedicationRequest's identical note).
// Every clinical field is optional: an omitted field means "copy from the stopped
// source record" (api-spec.md section 4.10). StartDate is nullable, not [Required] -
// api-spec.md section 4.10 says it "defaults to 'today' if omitted"; the controller
// applies that default (DateTime.UtcNow.Date) before calling the Service layer, which
// still takes a non-nullable startDate (Step 8, unchanged by this step).
public class ResumeMedicationRequest
{
    public DateTime? StartDate { get; set; }

    [Range(typeof(decimal), "0", "79228162514264337593543950335")]
    public decimal? Dose { get; set; }

    public string? DoseUnitCode { get; set; }

    public string? FrequencyCode { get; set; }

    [Range(0, int.MaxValue)]
    public int? Duration { get; set; }

    public string? DurationUnitCode { get; set; }

    [Range(typeof(decimal), "0", "79228162514264337593543950335")]
    public decimal? Quantity { get; set; }

    [StringLength(500)]
    public string? Instructions { get; set; }

    public bool? PRN { get; set; }

    public DateTime? EndDate { get; set; }

    public string? ClinicalNotes { get; set; }

    public int? PrescribedByUserAccountId { get; set; }
}
