namespace Prescription.Application.Exceptions;

public class DuplicateMedicineCodeException : Exception
{
    public DuplicateMedicineCodeException() : base("A medicine with this code already exists.")
    {
    }
}
