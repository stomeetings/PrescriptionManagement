namespace Prescription.Application.Exceptions;

public class InvalidMedicineReferenceException : Exception
{
    public InvalidMedicineReferenceException() : base("The specified medicine does not exist or is not active.")
    {
    }
}
