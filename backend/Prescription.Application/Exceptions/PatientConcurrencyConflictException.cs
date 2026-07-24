namespace Prescription.Application.Exceptions;

public class PatientConcurrencyConflictException : Exception
{
    public PatientConcurrencyConflictException() : base("This patient was modified by someone else. Reload and try again.")
    {
    }
}
