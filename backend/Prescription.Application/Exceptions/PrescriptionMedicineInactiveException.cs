namespace Prescription.Application.Exceptions;

public class PrescriptionMedicineInactiveException : Exception
{
    public PrescriptionMedicineInactiveException() : base("One or more prescribed medicines are no longer active.")
    {
    }
}
