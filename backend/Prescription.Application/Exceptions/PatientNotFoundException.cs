namespace Prescription.Application.Exceptions;

public class PatientNotFoundException : Exception
{
    public PatientNotFoundException() : base("The specified patient was not found.")
    {
    }
}
