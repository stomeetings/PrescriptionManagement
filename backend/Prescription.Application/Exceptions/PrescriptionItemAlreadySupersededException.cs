namespace Prescription.Application.Exceptions;

public class PrescriptionItemAlreadySupersededException : Exception
{
    public PrescriptionItemAlreadySupersededException() : base("This prescription item has already been superseded by another replacement.")
    {
    }
}
