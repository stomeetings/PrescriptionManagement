namespace Prescription.Shared.DTOs;

public class FinalizePrescriptionResponse
{
    public int PrescriptionId { get; set; }
    public string PrescriptionNumber { get; set; }
    public PrescriptionStatusResponse Status { get; set; }
    public DateTime FinalizedDate { get; set; }
    public string FinalizedBy { get; set; }
}
