namespace Prescription.Application.Exceptions;

public class InvalidPatientReferenceException : Exception
{
    public InvalidPatientReferenceException() : base("The specified patient does not exist or is not active.")
    {
    }
}
