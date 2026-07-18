namespace Prescription.Application.Exceptions;

public class UserNotFoundException : Exception
{
    public UserNotFoundException() : base("The specified user was not found.")
    {
    }
}
