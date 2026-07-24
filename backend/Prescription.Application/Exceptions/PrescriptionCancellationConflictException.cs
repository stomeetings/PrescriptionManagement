namespace Prescription.Application.Exceptions;

// Race-guard only - fires when the status-guarded UPDATE in usp_Prescription_Cancel
// affects zero rows despite the procedure's own pre-check having passed, meaning another
// request changed this Prescription's status in between.
public class PrescriptionCancellationConflictException : Exception
{
    public PrescriptionCancellationConflictException() : base("This prescription's status changed before the cancellation could complete. Please refresh and try again.")
    {
    }
}
