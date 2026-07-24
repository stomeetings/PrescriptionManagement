namespace Prescription.Application.Exceptions;

// api-spec.md section 4.8 rule 3: if none of the requested Ids resolve to a valid,
// current medication, the endpoint returns 422 ("nothing to draft") rather than a 200
// with an empty selection.
public class NoEligiblePatientMedicationsException : Exception
{
    public NoEligiblePatientMedicationsException() : base("None of the selected patient medications are currently active and eligible for a prescription draft.")
    {
    }
}
