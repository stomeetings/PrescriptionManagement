namespace Prescription.Application.Exceptions;

public class DuplicateEmailException : Exception
{
    public DuplicateEmailException() : base("A user with this email already exists.")
    {
    }
}
