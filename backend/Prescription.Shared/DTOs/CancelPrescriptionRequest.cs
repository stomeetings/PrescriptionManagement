using System.ComponentModel.DataAnnotations;

namespace Prescription.Shared.DTOs;

// CancellationType is one of the six values the dialog's own dropdown offers (Clinical
// Decision, Entered In Error, Duplicate Prescription, Patient Request, Provider Request,
// Other) - validated here so an invalid value is a clean 400, not a raw CHECK-constraint
// SqlException bubbling up from usp_Prescription_Cancel. All three fields are required,
// matching the task's own "Require: Cancellation Type, Reason, Comments" list literally.
public class CancelPrescriptionRequest
{
    [Required]
    [RegularExpression("^(CLINICAL_DECISION|ENTERED_IN_ERROR|DUPLICATE_PRESCRIPTION|PATIENT_REQUEST|PROVIDER_REQUEST|OTHER)$")]
    public string CancellationType { get; set; }

    [Required]
    [StringLength(500, MinimumLength = 1)]
    public string Reason { get; set; }

    [Required]
    [StringLength(1000, MinimumLength = 1)]
    public string Comments { get; set; }
}
