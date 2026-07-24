namespace Prescription.Application.Exceptions;

public class PrescriptionExpiredException : Exception
{
    public PrescriptionExpiredException() : base("This prescription has expired and cannot be renewed.")
    {
    }
}
