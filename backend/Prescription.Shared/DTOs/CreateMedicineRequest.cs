using System.ComponentModel.DataAnnotations;

namespace Prescription.Shared.DTOs;

public class CreateMedicineRequest
{
    [Required]
    [StringLength(20)]
    public string MedicineCode { get; set; }

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

    public bool IsControlledDrug { get; set; } = false;

    [StringLength(4000)]
    public string? Notes { get; set; }
}
