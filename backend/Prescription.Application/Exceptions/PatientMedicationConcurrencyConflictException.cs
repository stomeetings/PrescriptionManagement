namespace Prescription.Application.Exceptions;

public class PatientMedicationConcurrencyConflictException : Exception
{
    public PatientMedicationConcurrencyConflictException() : base("This patient medication was modified by someone else. Reload and try again.")
    {
    }
}
