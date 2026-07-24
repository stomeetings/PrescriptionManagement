namespace Prescription.Application.Exceptions;

public class InvalidDoseUnitException : Exception
{
    public InvalidDoseUnitException() : base("The specified dose unit does not exist or is not active.")
    {
    }
}
