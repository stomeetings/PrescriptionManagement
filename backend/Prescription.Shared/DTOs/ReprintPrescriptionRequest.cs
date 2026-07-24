using System.ComponentModel.DataAnnotations;

namespace Prescription.Shared.DTOs;

public class ReprintPrescriptionRequest
{
    [Required]
    [StringLength(500, MinimumLength = 1)]
    public string Reason { get; set; }

    [Range(1, 5)]
    public int Copies { get; set; } = 1;

    // "Preview before printing" is a purely client-side choice (whether the frontend
    // opens the preview modal before printing) - accepted here only so it round-trips
    // with the rest of the request shape the task specifies; it has no effect on what
    // the backend does.
    public bool Preview { get; set; }
}
