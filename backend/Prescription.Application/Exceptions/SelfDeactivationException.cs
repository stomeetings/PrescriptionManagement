namespace Prescription.Application.Exceptions;

public class SelfDeactivationException : Exception
{
    public SelfDeactivationException() : base("An Administrator cannot deactivate their own account.")
    {
    }
}
