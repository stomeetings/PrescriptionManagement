namespace Prescription.Application.Exceptions;

// In practice this should be unreachable from client input - PatientNumber is generated
// server-side by usp_Patient_Create from Patient_PatientNumberSequence and is never
// client-supplied. Kept only because the UQ_Patient_PatientNumber constraint could still
// theoretically fire (e.g. a sequence/data anomaly), and usp_Patient_Create translates
// that violation into this exception rather than letting a raw SqlException surface.
public class DuplicatePatientNumberException : Exception
{
    public DuplicatePatientNumberException() : base("A patient with this patient number already exists.")
    {
    }
}
