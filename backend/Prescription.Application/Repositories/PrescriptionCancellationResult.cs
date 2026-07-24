namespace Prescription.Application.Repositories;

public class PrescriptionCancellationResult
{
    public int PrescriptionId { get; set; }
    public string PrescriptionNumber { get; set; }
    public string StatusCode { get; set; }
    public string StatusDisplayText { get; set; }
    public DateTime CancelledDate { get; set; }
    public string CancelledBy { get; set; }
    public int CancelledItemCount { get; set; }
}
