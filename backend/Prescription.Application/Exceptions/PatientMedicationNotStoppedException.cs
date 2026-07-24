namespace Prescription.Application.Exceptions;

public class PatientMedicationNotStoppedException : Exception
{
    public PatientMedicationNotStoppedException() : base("Only a stopped patient medication can be resumed.")
    {
    }
}
