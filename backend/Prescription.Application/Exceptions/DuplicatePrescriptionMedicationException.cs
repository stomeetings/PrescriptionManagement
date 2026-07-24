namespace Prescription.Application.Exceptions;

public class DuplicatePrescriptionMedicationException : Exception
{
    public DuplicatePrescriptionMedicationException() : base("This prescription contains duplicate medications.")
    {
    }
}
