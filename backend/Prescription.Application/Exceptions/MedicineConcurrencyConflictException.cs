namespace Prescription.Application.Exceptions;

public class MedicineConcurrencyConflictException : Exception
{
    public MedicineConcurrencyConflictException() : base("This medicine was modified by someone else. Reload and try again.")
    {
    }
}
