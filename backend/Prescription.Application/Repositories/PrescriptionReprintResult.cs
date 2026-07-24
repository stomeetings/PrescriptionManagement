namespace Prescription.Application.Repositories;

// Returned by usp_Prescription_Reprint's own final SELECT.
public class PrescriptionReprintResult
{
    public int PrintCount { get; set; }
    public DateTime PrintedDate { get; set; }
    public string PrintedBy { get; set; }
    public int VersionPrinted { get; set; }
}
