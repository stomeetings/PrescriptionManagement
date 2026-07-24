namespace Prescription.Application.Exceptions;

public class PrescriptionNotFinalizedException : Exception
{
    public PrescriptionNotFinalizedException() : base("Only a finalized prescription can be reprinted. Use Print for a Draft.")
    {
    }
}
