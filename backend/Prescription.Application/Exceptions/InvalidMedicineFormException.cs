namespace Prescription.Application.Exceptions;

public class InvalidMedicineFormException : Exception
{
    public InvalidMedicineFormException() : base("The specified dosage form does not exist or is not active.")
    {
    }
}
