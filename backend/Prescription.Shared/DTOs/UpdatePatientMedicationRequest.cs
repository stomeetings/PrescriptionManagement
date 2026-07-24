using System.ComponentModel.DataAnnotations;

namespace Prescription.Shared.DTOs;

// Identical to CreatePatientMedicationRequest minus PatientId/MedicineId - both
// structurally absent, immutable once created (api-spec.md section 5) - plus RowVersion.
public class UpdatePatientMedicationRequest
{
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

    public string? ClinicalNotes { get; set; }

    public int? PrescribedByUserAccountId { get; set; }

    // Base64-encoded automatically by System.Text.Json for a byte[] property. A stale
    // value results in a 409 Conflict, not a validation error.
    [Required]
    public byte[] RowVersion { get; set; }
}
