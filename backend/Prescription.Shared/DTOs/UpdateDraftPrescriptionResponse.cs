namespace Prescription.Shared.DTOs;

public class UpdateDraftPrescriptionResponse
{
    public int PrescriptionId { get; set; }
    public string PrescriptionNumber { get; set; }
    public PrescriptionStatusResponse Status { get; set; }

    // The version this edit just created (Step 18.7's own versioning-on-top-of-Update
    // trigger) - lets the caller immediately reflect "Version N saved" without a
    // separate GET .../versions round trip.
    public int VersionNumber { get; set; }
    public DateTime SavedDate { get; set; }
    public string SavedBy { get; set; }

    // Base64-encoded automatically by System.Text.Json - required on the *next* Update
    // call for optimistic concurrency (this response's own edit just consumed the
    // previous value).
    public byte[] RowVersion { get; set; }
}
