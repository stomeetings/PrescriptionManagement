namespace Prescription.Application.Exceptions;

public class InvalidGenderException : Exception
{
    public InvalidGenderException() : base("The specified gender does not exist or is not active.")
    {
    }
}
