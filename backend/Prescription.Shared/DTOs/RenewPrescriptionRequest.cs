using System.ComponentModel.DataAnnotations;

namespace Prescription.Shared.DTOs;

// SelectedItems, not a bare int[] of "Selected Prescription Item Ids" - this feature's
// own "Allow modification of: Quantity, Duration, Directions" requires carrying each
// selection's own (possibly clinician-edited) final values, not just which items were
// picked. Medicine/Strength are never here at all - "Do not allow modification of:
// Medicine, Strength" is enforced by never accepting them as input, not by validating a
// submitted value against the original.
public class RenewPrescriptionRequest
{
    [Required]
    [MinLength(1)]
    public List<RenewPrescriptionItemRequest> SelectedItems { get; set; }
}

public class RenewPrescriptionItemRequest
{
    [Required]
    public int PrescriptionItemId { get; set; }

    [Required]
    [Range(0.01, double.MaxValue)]
    public decimal Quantity { get; set; }

    [Required]
    [Range(0, int.MaxValue)]
    public int Duration { get; set; }

    public string? Instructions { get; set; }
}
