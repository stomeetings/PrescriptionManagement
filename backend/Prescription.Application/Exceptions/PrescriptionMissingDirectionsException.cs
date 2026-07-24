namespace Prescription.Application.Exceptions;

public class PrescriptionMissingDirectionsException : Exception
{
    public PrescriptionMissingDirectionsException() : base("All medications must have complete directions before finalizing.")
    {
    }
}
