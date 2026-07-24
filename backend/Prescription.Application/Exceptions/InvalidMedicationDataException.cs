namespace Prescription.Application.Exceptions;

// Catch-all for the remaining PatientMedication CHECK constraints (Quantity/Duration/
// Dose >= 0) - distinct from InvalidMedicationDateRangeException, which has its own more
// specific message for the one CHECK violation common enough to deserve one.
public class InvalidMedicationDataException : Exception
{
    public InvalidMedicationDataException() : base("The medication data supplied is invalid.")
    {
    }
}
