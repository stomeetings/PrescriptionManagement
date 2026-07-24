namespace Prescription.Domain.Entities;

/// <summary>
/// Append-only audit trail for a Prescription (database-spec.md section 3.3) - a
/// dedicated, per-module table mirroring PatientMedicationHistory's pattern, not the
/// generic "AuditLog" CLAUDE.md names as a concept but which no module in this project
/// has actually built.
/// </summary>
public class PrescriptionAudit
{
    public int PrescriptionAuditId { get; set; }
    public int PrescriptionId { get; set; }

    /// <summary>One of CREATED, UPDATED - deliberately minimal (database-spec.md section 3.3), not the full future Pending/Sent/Cancelled lifecycle.</summary>
    public string Action { get; set; }

    public string PreviousValues { get; set; }
    public string NewValues { get; set; }
    public string ChangedBy { get; set; }
    public DateTime ChangedDate { get; set; }
}
