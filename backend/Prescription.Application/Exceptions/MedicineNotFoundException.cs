namespace Prescription.Application.Exceptions;

public class MedicineNotFoundException : Exception
{
    public MedicineNotFoundException() : base("The specified medicine was not found.")
    {
    }
}
