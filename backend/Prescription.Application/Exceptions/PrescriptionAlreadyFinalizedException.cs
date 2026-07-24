namespace Prescription.Application.Exceptions;

public class PrescriptionAlreadyFinalizedException : Exception
{
    public PrescriptionAlreadyFinalizedException() : base("This prescription has already been finalized.")
    {
    }
}
