namespace Prescription.Application.Exceptions;

public class PatientMedicationNotFoundException : Exception
{
    public PatientMedicationNotFoundException() : base("The specified patient medication was not found.")
    {
    }
}
