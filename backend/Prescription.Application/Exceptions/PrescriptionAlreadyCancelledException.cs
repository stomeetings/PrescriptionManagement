namespace Prescription.Application.Exceptions;

// Deliberately not a reuse of the existing PrescriptionCancelledException, whose message
// ("A cancelled prescription cannot be reprinted.") is specific to the Reprint feature -
// reusing it here for a cancel-on-already-cancelled conflict would show a misleading
// message on this feature's own confirmation dialog.
public class PrescriptionAlreadyCancelledException : Exception
{
    public PrescriptionAlreadyCancelledException() : base("This prescription has already been cancelled.")
    {
    }
}
