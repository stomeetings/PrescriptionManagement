namespace Prescription.Application.Exceptions;

public class PrescriptionNotEditableException : Exception
{
    public PrescriptionNotEditableException() : base("Only a Draft-status prescription can be edited.")
    {
    }
}
