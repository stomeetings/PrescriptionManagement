namespace Prescription.Application.Repositories;

// Returned by usp_Prescription_RestoreVersion's own final SELECT.
public class PrescriptionRestoreResult
{
    public int PrescriptionId { get; set; }
    public string PrescriptionNumber { get; set; }
    public string StatusCode { get; set; }
    public string StatusDisplayText { get; set; }
    public int VersionNumber { get; set; }
    public int RestoredFromVersionNumber { get; set; }
    public DateTime UpdatedDate { get; set; }
    public string UpdatedBy { get; set; }

    // The restore's own UPDATE doesn't check the caller's RowVersion (restore is a
    // deliberate override, not a normal edit), but it still changes the live row's
    // RowVersion - returned here so the frontend's cached value for the *next* Edit call
    // doesn't go stale.
    public byte[] RowVersion { get; set; }
}
