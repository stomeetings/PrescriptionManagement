using System.ComponentModel.DataAnnotations;

namespace Prescription.Shared.DTOs;

public class CreatePatientMedicationRequest
{
    [Required]
    public int PatientId { get; set; }

    [Required]
    public int MedicineId { get; set; }

    [Required]
    [Range(typeof(decimal), "0", "79228162514264337593543950335")]
    public decimal Dose { get; set; }

    [Required]
    public string DoseUnitCode { get; set; }

    [Required]
    public string FrequencyCode { get; set; }

    [Required]
    [Range(0, int.MaxValue)]
    public int Duration { get; set; }

    [Required]
    public string DurationUnitCode { get; set; }

    [Required]
    [Range(typeof(decimal), "0", "79228162514264337593543950335")]
    public decimal Quantity { get; set; }

    [Required]
    [StringLength(500)]
    public string Instructions { get; set; }

    [Required]
    public bool PRN { get; set; }

    [Required]
    public DateTime StartDate { get; set; }

    public DateTime? EndDate { get; set; }

    // No StringLength cap - ClinicalNotes is NVARCHAR(MAX) per database-spec.md, an
    // intentional exception to every other free-text field in this project.
    public string? ClinicalNotes { get; set; }

    // Independent of the authenticated caller (CreatedBy) - see api-spec.md section 4.6
    // rule 5. The clinician clinically responsible may differ from whoever operated the
    // data-entry screen.
    public int? PrescribedByUserAccountId { get; set; }
}
