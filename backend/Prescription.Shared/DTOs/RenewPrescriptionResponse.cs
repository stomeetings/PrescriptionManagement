namespace Prescription.Shared.DTOs;

// DraftPrescriptionId is the real, persisted int PrescriptionId of the newly created
// DRAFT prescription - not the transient Guid DraftPrescriptionId concept used by the
// Generate-Draft-before-Save flow (Step 18.2). This feature's own "Draft Prescription Id"
// response field means "the id of the prescription that is now in Draft status".
public class RenewPrescriptionResponse
{
    public int DraftPrescriptionId { get; set; }
    public string NewPrescriptionNumber { get; set; }
}
