namespace Prescription.Shared.DTOs;

public class SaveDraftPrescriptionResponse
{
    public int PrescriptionId { get; set; }
    public string PrescriptionNumber { get; set; }
    public PrescriptionStatusResponse Status { get; set; }
    public DateTime SavedDate { get; set; }
    public string SavedBy { get; set; }

    // Base64-encoded automatically by System.Text.Json - required on the next
    // PUT .../drafts/{id} call (Step 18.7's Edit) for optimistic concurrency.
    public byte[] RowVersion { get; set; }
}
