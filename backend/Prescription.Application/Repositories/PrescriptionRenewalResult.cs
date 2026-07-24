namespace Prescription.Application.Repositories;

// Returned by usp_Prescription_Renew's own final SELECT. NewPrescriptionId is the real,
// persisted int PrescriptionId of the newly created DRAFT Prescription - not the
// transient Guid DraftPrescriptionId concept used by the Generate-Draft-before-Save flow
// (Step 18.2). This feature's own "Draft Prescription Id" response field means "the id
// of the prescription that is now in Draft status", which is that same real int id.
public class PrescriptionRenewalResult
{
    public int NewPrescriptionId { get; set; }
    public string NewPrescriptionNumber { get; set; }
}
