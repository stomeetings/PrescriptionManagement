namespace Prescription.Application.Exceptions;

public class InvalidPrescriptionIssueDateException : Exception
{
    public InvalidPrescriptionIssueDateException() : base("Issue date cannot be in the future.")
    {
    }
}
