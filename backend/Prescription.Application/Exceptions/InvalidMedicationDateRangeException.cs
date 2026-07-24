namespace Prescription.Application.Exceptions;

public class InvalidMedicationDateRangeException : Exception
{
    public InvalidMedicationDateRangeException() : base("End date cannot be before start date.")
    {
    }
}
