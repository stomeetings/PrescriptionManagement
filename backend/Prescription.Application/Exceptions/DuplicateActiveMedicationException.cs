namespace Prescription.Application.Exceptions;

public class DuplicateActiveMedicationException : Exception
{
    public DuplicateActiveMedicationException() : base("This patient already has an active medication for this medicine.")
    {
    }
}
