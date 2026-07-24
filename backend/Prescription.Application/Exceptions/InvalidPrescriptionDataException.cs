namespace Prescription.Application.Exceptions;

// Catch-all for CHECK constraint violations (SQL error 547) on Prescription/
// PrescriptionItem - e.g. Quantity <= 0, Duration < 0, ExpiryDate before IssueDate.
public class InvalidPrescriptionDataException : Exception
{
    public InvalidPrescriptionDataException() : base("The prescription contains invalid data.")
    {
    }
}
