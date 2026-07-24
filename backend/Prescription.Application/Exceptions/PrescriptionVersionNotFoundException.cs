namespace Prescription.Application.Exceptions;

public class PrescriptionVersionNotFoundException : Exception
{
    public PrescriptionVersionNotFoundException() : base("Prescription version not found.")
    {
    }
}
