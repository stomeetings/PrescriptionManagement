namespace Prescription.Shared.DTOs;

public class CancelPrescriptionResponse
{
    public int PrescriptionId { get; set; }
    public string PrescriptionNumber { get; set; }
    public PrescriptionStatusResponse Status { get; set; }
    public DateTime CancelledDate { get; set; }
    public string CancelledBy { get; set; }
    public int CancelledItemCount { get; set; }
}
