namespace Prescription.Application.Exceptions;

public class ConcurrencyConflictException : Exception
{
    public ConcurrencyConflictException() : base("This user was modified by someone else. Reload and try again.")
    {
    }
}
