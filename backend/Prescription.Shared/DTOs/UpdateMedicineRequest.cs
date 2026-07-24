using System.ComponentModel.DataAnnotations;

namespace Prescription.Shared.DTOs;

// MedicineCode and IsActive are deliberately absent - MedicineCode cannot be changed
// after creation (business spec section 5.5) and there is no property for a caller to
// supply one through; IsActive changes only through ActivateMedicineRequest/
// DeactivateMedicineRequest, matching usp_Medicine_Update's own parameter list.
public class UpdateMedicineRequest
{
    [Required]
    [StringLength(200)]
    public string MedicineName { get; set; }

    [Required]
    [StringLength(200)]
    public string GenericName { get; set; }

    [StringLength(200)]
    public string? BrandName { get; set; }

    [Required]
    [StringLength(50)]
    public string Strength { get; set; }

    [Required]
    public string MedicineFormCode { get; set; }

    [Required]
    public string MedicineRouteCode { get; set; }

    [StringLength(200)]
    public string? Manufacturer { get; set; }

    [StringLength(20)]
    public string? ATCCode { get; set; }

    public bool IsControlledDrug { get; set; }

    [StringLength(4000)]
    public string? Notes { get; set; }

    // Base64-encoded automatically by System.Text.Json for a byte[] property - no
    // custom (de)serialization needed. Required for optimistic concurrency; a stale
    // value results in a 409 Conflict, not a validation error.
    [Required]
    public byte[] RowVersion { get; set; }
}
