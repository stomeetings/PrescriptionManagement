namespace Prescription.Application.Exceptions;

public class NoClinicallySignificantChangeException : Exception
{
    public NoClinicallySignificantChangeException() : base("No clinically significant change was detected - a replacement is not required.")
    {
    }
}
