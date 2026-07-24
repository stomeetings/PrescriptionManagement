namespace Prescription.Application.Exceptions;

public class InvalidFrequencyException : Exception
{
    public InvalidFrequencyException() : base("The specified frequency does not exist or is not active.")
    {
    }
}
