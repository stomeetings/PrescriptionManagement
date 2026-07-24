namespace Prescription.Application.Exceptions;

public class InvalidPrescriptionExpiryDateException : Exception
{
    public InvalidPrescriptionExpiryDateException() : base("Expiry date cannot be before the issue date.")
    {
    }
}
