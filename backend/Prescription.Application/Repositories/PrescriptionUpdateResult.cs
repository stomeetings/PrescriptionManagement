namespace Prescription.Application.Repositories;

// Returned by usp_Prescription_UpdateDraft's own final SELECT (see that script's
// comments) - mirrors PrescriptionCreateResult's identical role for the Create path,
// plus VersionNumber (the version this Update call just created).
public class PrescriptionUpdateResult
{
    public int PrescriptionId { get; set; }
    public string PrescriptionNumber { get; set; }
    public string StatusCode { get; set; }
    public string StatusDisplayText { get; set; }
    public int VersionNumber { get; set; }
    public DateTime UpdatedDate { get; set; }
    public string UpdatedBy { get; set; }

    // Required on the next Update call for optimistic concurrency.
    public byte[] RowVersion { get; set; }
}
