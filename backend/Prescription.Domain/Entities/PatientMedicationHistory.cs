namespace Prescription.Domain.Entities;

/// <summary>
/// An append-only audit-log entry for a PatientMedication (database-spec.md section
/// 3.2) - the first dedicated history/audit-log entity in this project, because "View
/// Medication History" is a first-class functional requirement for this module, unlike
/// any prior module's plain CreatedBy/UpdatedBy columns. Complements, rather than
/// duplicates, PatientMedication's own row-per-Stop/Resume-cycle history: this table
/// captures field-level edits to a still-current record that the row-chain model does
/// not.
/// </summary>
public class PatientMedicationHistory
{
    /// <summary>Surrogate primary key.</summary>
    public int HistoryId { get; set; }

    /// <summary>Foreign key to the PatientMedication this entry describes a change to.</summary>
    public int PatientMedicationId { get; set; }

    /// <summary>One of CREATED, UPDATED, STOPPED, RESUMED (enforced by a database CHECK constraint).</summary>
    public string Action { get; set; }

    /// <summary>
    /// JSON snapshot of the row before the change, stored as validated text (SQL Server
    /// has no native JSON column type at the 2022+ baseline this project targets). Null
    /// for a CREATED action, since nothing existed before it.
    /// </summary>
    public string PreviousValues { get; set; }

    /// <summary>JSON snapshot of the row after the change, stored as validated text.</summary>
    public string NewValues { get; set; }

    /// <summary>Username who made this change.</summary>
    public string ChangedBy { get; set; }

    /// <summary>Timestamp this change was recorded (UTC).</summary>
    public DateTime ChangedDate { get; set; }
}
