namespace Prescription.Application.Exceptions;

public class PatientMedicationAlreadyStoppedException : Exception
{
    public PatientMedicationAlreadyStoppedException() : base("This patient medication has already been stopped.")
    {
    }
}
