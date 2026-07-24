namespace Prescription.Application.Exceptions;

public class PrescriptionConcurrencyConflictException : Exception
{
    public PrescriptionConcurrencyConflictException() : base("This prescription was modified by someone else. Reload and try again.")
    {
    }
}
