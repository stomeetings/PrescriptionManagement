namespace Prescription.Application.Exceptions;

public class PrescriptionNotFoundException : Exception
{
    public PrescriptionNotFoundException() : base("Prescription not found.")
    {
    }
}
