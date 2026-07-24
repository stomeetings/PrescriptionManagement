namespace Prescription.Shared.DTOs;

public class RestoreVersionResponse
{
    public int PrescriptionId { get; set; }
    public string PrescriptionNumber { get; set; }
    public PrescriptionStatusResponse Status { get; set; }

    // The brand-new version this restore just created - never the same number as
    // RestoredFromVersionNumber (restore always appends, never overwrites history).
    public int VersionNumber { get; set; }
    public int RestoredFromVersionNumber { get; set; }
    public DateTime SavedDate { get; set; }
    public string SavedBy { get; set; }

    // Base64-encoded automatically by System.Text.Json - required on the *next* Edit
    // call for optimistic concurrency (see PrescriptionRestoreResult's own note).
    public byte[] RowVersion { get; set; }
}
