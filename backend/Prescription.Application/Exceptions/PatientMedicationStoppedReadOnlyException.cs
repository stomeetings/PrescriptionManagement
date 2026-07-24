namespace Prescription.Application.Exceptions;

public class PatientMedicationStoppedReadOnlyException : Exception
{
    public PatientMedicationStoppedReadOnlyException() : base("A stopped patient medication is read-only and cannot be edited.")
    {
    }
}
