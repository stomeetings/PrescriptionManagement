namespace Prescription.Application.Exceptions;

// Deliberately its own exception rather than reusing PrescriptionNotFinalizedException
// (whose message says "...can be reprinted") - see PrescriptionAlreadyCancelledException's
// own comment for why message-reuse across features is avoided in this project.
public class PrescriptionNotEligibleForCancellationException : Exception
{
    public PrescriptionNotEligibleForCancellationException() : base("Only a finalized prescription can be cancelled. A Draft can simply be discarded.")
    {
    }
}
