namespace Prescription.Application.Exceptions;

public class NoActivePrescriptionItemException : Exception
{
    public NoActivePrescriptionItemException() : base("This medication is not part of any active finalized prescription.")
    {
    }
}
