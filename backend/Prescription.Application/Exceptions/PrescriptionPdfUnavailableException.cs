namespace Prescription.Application.Exceptions;

public class PrescriptionPdfUnavailableException : Exception
{
    public PrescriptionPdfUnavailableException() : base("Unable to generate or retrieve the prescription PDF.")
    {
    }
}
