namespace Prescription.Application.Exceptions;

public class DuplicateNhiNumberException : Exception
{
    public DuplicateNhiNumberException() : base("A patient with this NHI number already exists.")
    {
    }
}
