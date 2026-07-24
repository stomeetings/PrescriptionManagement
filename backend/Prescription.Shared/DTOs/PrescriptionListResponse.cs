namespace Prescription.Shared.DTOs;

// One row in the Prescription Management List/Search grid.
public class PrescriptionListResponse
{
    public int PrescriptionId { get; set; }
    public string PrescriptionNumber { get; set; }
    public int PatientId { get; set; }
    public string PatientName { get; set; }
    public string NHINumber { get; set; }
    public int ProviderUserAccountId { get; set; }
    public string ProviderName { get; set; }
    public DateTime IssueDate { get; set; }
    public DateTime? ExpiryDate { get; set; }
    public int MedicationCount { get; set; }
    public PrescriptionStatusResponse Status { get; set; }

    // Nullable - a Prescription with no PrescriptionVersion rows can't exist under this
    // module's own invariants (Save Draft always seeds Version 1), but the underlying
    // MAX() aggregate is nullable at the SQL level, so this stays nullable in C# too
    // rather than asserting a guarantee the query itself doesn't express.
    public int? VersionNumber { get; set; }
    public string CreatedBy { get; set; }
    public DateTime CreatedDate { get; set; }
}
