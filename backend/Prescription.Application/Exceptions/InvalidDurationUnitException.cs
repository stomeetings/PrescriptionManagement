namespace Prescription.Application.Exceptions;

public class InvalidDurationUnitException : Exception
{
    public InvalidDurationUnitException() : base("The specified duration unit does not exist or is not active.")
    {
    }
}
