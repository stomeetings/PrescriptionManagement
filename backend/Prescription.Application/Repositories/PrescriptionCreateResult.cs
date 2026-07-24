namespace Prescription.Application.Repositories;

// Returned by usp_Prescription_CreateDraft's own final SELECT (see that script's
// comments) - avoids a separate GetById round trip this step doesn't otherwise need.
public class PrescriptionCreateResult
{
    public int PrescriptionId { get; set; }
    public string PrescriptionNumber { get; set; }
    public string StatusCode { get; set; }
    public string StatusDisplayText { get; set; }
    public DateTime CreatedDate { get; set; }
    public string CreatedBy { get; set; }

    // Required on the next Update call for optimistic concurrency - same convention as
    // every other *DetailResponse/RowVersion pair in this project.
    public byte[] RowVersion { get; set; }
}
