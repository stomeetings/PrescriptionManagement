namespace Prescription.Application.Repositories;

// Returned by usp_Prescription_Finalize's own final SELECT.
public class PrescriptionFinalizeResult
{
    public int PrescriptionId { get; set; }
    public string PrescriptionNumber { get; set; }
    public string StatusCode { get; set; }
    public string StatusDisplayText { get; set; }
    public DateTime FinalizedDate { get; set; }
    public string FinalizedBy { get; set; }
}
