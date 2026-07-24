namespace Prescription.Application.Exceptions;

public class MissingPrescriptionXhtmlException : Exception
{
    public MissingPrescriptionXhtmlException() : base("The prescription document (XHTML) is missing. Generate a preview before saving.")
    {
    }
}
