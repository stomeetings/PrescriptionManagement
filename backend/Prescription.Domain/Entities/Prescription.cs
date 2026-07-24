namespace Prescription.Domain.Entities;

/// <summary>
/// The persisted header row for a Prescription at any status (database-spec.md section
/// 3.1) - "Draft" is a PrescriptionStatusId value this row can hold, not a separate
/// table (CLAUDE.md already fixes Prescription/PrescriptionItem as the entity names).
/// </summary>
public class Prescription
{
    public int PrescriptionId { get; set; }
    public string PrescriptionNumber { get; set; }

    /// <summary>The transient correlation Guid from the Generate Draft/Preview step - persisted for duplicate-draft detection.</summary>
    public Guid DraftPrescriptionId { get; set; }

    public int PatientId { get; set; }

    /// <summary>The prescribing clinician - assumed to be the authenticated caller (prescription-management.md section 15 item 5).</summary>
    public int ProviderUserAccountId { get; set; }

    public int PrescriptionStatusId { get; set; }
    public string ClinicalNotes { get; set; }

    /// <summary>The exact rendered document at save time - a deliberate snapshot, not regenerated on read (database-spec.md section 2 item 6).</summary>
    public string Xhtml { get; set; }

    public DateTime IssueDate { get; set; }
    public DateTime? ExpiryDate { get; set; }
    public byte[] RowVersion { get; set; }
    public DateTime CreatedDate { get; set; }
    public string CreatedBy { get; set; }
    public DateTime? UpdatedDate { get; set; }
    public string UpdatedBy { get; set; }
    public bool IsDeleted { get; set; }
}
