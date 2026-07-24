namespace Prescription.Application.Exceptions;

// Thrown when the same DraftPrescriptionId (from a prior Generate Draft/Preview call) is
// submitted to Save Draft more than once - a double-click or retried request, not a
// second, distinct prescription.
public class DuplicatePrescriptionDraftException : Exception
{
    public DuplicatePrescriptionDraftException() : base("This prescription draft has already been saved.")
    {
    }
}
