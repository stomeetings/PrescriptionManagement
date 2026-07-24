namespace Prescription.Application.Exceptions;

public class PrescriptionCancelledException : Exception
{
    public PrescriptionCancelledException() : base("A cancelled prescription cannot be reprinted.")
    {
    }
}
