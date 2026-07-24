namespace Prescription.Application.Repositories;

public interface IPrescriptionFinalizeRepository
{
    // All validation (existence, Draft status, patient/provider active, medications
    // exist/active/no duplicates/directions complete, issue/expiry date valid) is
    // authoritative in usp_Prescription_Finalize, translated to typed exceptions here -
    // same convention as every other Prescription repository method.
    Task<PrescriptionFinalizeResult> FinalizeAsync(int prescriptionId, string finalizedBy);
}
