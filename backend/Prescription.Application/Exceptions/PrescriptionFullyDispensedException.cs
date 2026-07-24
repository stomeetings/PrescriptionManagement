namespace Prescription.Application.Exceptions;

public class PrescriptionFullyDispensedException : Exception
{
    public PrescriptionFullyDispensedException() : base("This prescription has already been fully dispensed and cannot be cancelled.")
    {
    }
}
