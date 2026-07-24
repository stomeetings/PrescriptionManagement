namespace Prescription.Application.Exceptions;

public class NoPrescriptionMedicationsException : Exception
{
    public NoPrescriptionMedicationsException() : base("At least one medication is required to save a prescription draft.")
    {
    }
}
