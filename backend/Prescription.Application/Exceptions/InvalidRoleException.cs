namespace Prescription.Application.Exceptions;

public class InvalidRoleException : Exception
{
    public InvalidRoleException() : base("The specified role does not exist or is not active.")
    {
    }
}
