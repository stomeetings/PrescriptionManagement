namespace Prescription.Shared.DTOs;

public class ReprintPrescriptionResponse
{
    public int PrintCount { get; set; }
    public DateTime PrintedDate { get; set; }
    public string PrintedBy { get; set; }
}
