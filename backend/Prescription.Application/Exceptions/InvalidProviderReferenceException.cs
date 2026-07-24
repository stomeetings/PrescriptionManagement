namespace Prescription.Application.Exceptions;

public class InvalidProviderReferenceException : Exception
{
    public InvalidProviderReferenceException() : base("The specified provider does not exist or is not active.")
    {
    }
}
