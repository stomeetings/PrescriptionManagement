namespace Prescription.Domain.Entities;

/// <summary>
/// A single entry on a patient's current-or-historical medication list (database-spec.md
/// section 3.1). Not a Prescription - this is the "current medication list" concept
/// (patient-medication-management.md section 1), maintained independently of the future
/// Prescription Management module. Flat POCO, identifier-only foreign keys (PatientId,
/// MedicineId, PrescribedByUserAccountId, and the four lookup Ids) - no ORM navigation
/// properties, matching every other entity in this project (Patient, Medicine,
/// UserAccount, etc. all follow the identical flat convention; no shared base entity is
/// used anywhere, including here).
/// </summary>
public class PatientMedication
{
    /// <summary>Surrogate primary key.</summary>
    public int PatientMedicationId { get; set; }

    /// <summary>Foreign key to the owning Patient (Patient.PatientId).</summary>
    public int PatientId { get; set; }

    /// <summary>
    /// Foreign key to the referenced Medicine (Medicine.MedicineId). Strength is not
    /// duplicated onto this entity - Medicine already fixes Strength per row.
    /// </summary>
    public int MedicineId { get; set; }

    /// <summary>Numeric dose amount per administration (e.g. 500), paired with DoseUnitId.</summary>
    public decimal Dose { get; set; }

    /// <summary>
    /// Foreign key to the existing DoseUnit lookup table (DoseUnit.DoseUnitId). Named
    /// "DoseUnitId", not "DoseUnitLookupId" - there is no generic LookupValue table in
    /// this project (Lookup Management uses one dedicated table per category); this
    /// reconciliation was made explicit in the approved database-spec.md section 2.
    /// </summary>
    public int DoseUnitId { get; set; }

    /// <summary>Foreign key to the existing Frequency lookup table (Frequency.FrequencyId).</summary>
    public int FrequencyId { get; set; }

    /// <summary>Numeric course length (e.g. 7), paired with DurationUnitId.</summary>
    public int Duration { get; set; }

    /// <summary>Foreign key to the existing DurationUnit lookup table (DurationUnit.DurationUnitId).</summary>
    public int DurationUnitId { get; set; }

    /// <summary>Total amount supplied/dispensed for this course.</summary>
    public decimal Quantity { get; set; }

    /// <summary>Patient-facing directions (e.g. "Take one tablet twice daily with food").</summary>
    public string Instructions { get; set; }

    /// <summary>"As needed" indicator.</summary>
    public bool PRN { get; set; }

    /// <summary>Date this medication course begins.</summary>
    public DateTime StartDate { get; set; }

    /// <summary>Date this medication course ends, if known in advance. Nullable - optional per business spec.</summary>
    public DateTime? EndDate { get; set; }

    /// <summary>Optional free-text clinical notes.</summary>
    public string ClinicalNotes { get; set; }

    /// <summary>
    /// Foreign key to the clinician clinically responsible for this medication
    /// (UserAccount.UserAccountId) - named "PrescribedByUserAccountId", not
    /// "PrescribedByUserId", since the actual table is UserAccount, not User. Nullable:
    /// distinct from CreatedBy - the responsible clinician may differ from whoever
    /// operated the data-entry screen, and not every entry has an identified prescriber.
    /// </summary>
    public int? PrescribedByUserAccountId { get; set; }

    /// <summary>
    /// Foreign key to the new PatientMedicationSource lookup table (not a generic
    /// LookupValue table - see DoseUnitId's remarks). Named "PatientMedicationSourceId",
    /// not "SourceLookupId".
    /// </summary>
    public int PatientMedicationSourceId { get; set; }

    /// <summary>
    /// Foreign key to the new PatientMedicationStatus lookup table (ACTIVE/STOPPED).
    /// Named "PatientMedicationStatusId", not "StatusLookupId".
    /// </summary>
    public int PatientMedicationStatusId { get; set; }

    /// <summary>
    /// True for the one current instance in a Stop/Resume chain; false for every
    /// superseded/historical row. Drives the "current medication list" view.
    /// </summary>
    public bool IsCurrent { get; set; }

    /// <summary>
    /// Included for consistency with every other entity's IsActive column, but likely
    /// redundant with IsCurrent - see database-spec.md section 11 item 2 (no business
    /// capability gives this flag independent meaning here).
    /// </summary>
    public bool IsActive { get; set; }

    /// <summary>
    /// Self-referencing foreign key (PatientMedication.PatientMedicationId) to the
    /// stopped record this one resumed from, if any. Not in this task's literal property
    /// list - added because the approved business spec requires resume traceability and
    /// the approved database spec resolved the mechanism as this column.
    /// </summary>
    public int? ResumedFromPatientMedicationId { get; set; }

    /// <summary>
    /// System-maintained row version for optimistic concurrency. Not in this task's
    /// literal property list - added for the same "concurrent multi-role edits" reasoning
    /// already applied to Patient and Medicine.
    /// </summary>
    public byte[] RowVersion { get; set; }

    public DateTime CreatedDate { get; set; }
    public string CreatedBy { get; set; }
    public DateTime? UpdatedDate { get; set; }
    public string UpdatedBy { get; set; }

    /// <summary>
    /// Date this medication was stopped. Not in this task's literal property list - added
    /// because the approved business spec requires it as a distinct audit field from
    /// UpdatedDate (stopping is a distinct audit event from an ordinary field edit).
    /// Never reset once set - a stopped record is permanently read-only.
    /// </summary>
    public DateTime? StoppedDate { get; set; }

    /// <summary>Username who stopped this medication. Same reasoning as StoppedDate.</summary>
    public string StoppedBy { get; set; }

    /// <summary>
    /// Reserved soft-delete flag, unused - no delete capability is in scope for this
    /// module (only Stop/Resume). Matches the project's standard audit-column set even
    /// though not in this task's literal property list, same as every other entity.
    /// </summary>
    public bool IsDeleted { get; set; }
}
