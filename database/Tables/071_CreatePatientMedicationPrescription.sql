-- Patient Medication and Prescription Synchronization: the complete "every prescription
-- item this Patient Medication has ever been part of" link/history table - denormalizes
-- what could technically already be derived by joining PrescriptionItem.PatientMedicationId
-- with PrescriptionItemReplacement's replacement chain, into one direct, chronologically
-- ordered table purpose-built for the Prescription History section and its own two GET
-- endpoints. Named PatientMedicationPrescriptionId (not the task's literal "Id") to match
-- this project's own <TableName>Id convention used by every other table.
-- CreatedBy/CreatedDate (not the task's literal "LinkedBy"/"LinkedDate") - this row's own
-- creation IS the linking event, same convention as every other audit-shaped table in
-- this module (PrescriptionItemReplacement/PrescriptionItemAmendment use CreatedBy/
-- CreatedDate or AmendedBy/AmendedDate, never a distinct "LinkedBy").
-- RelationshipType: only ORIGINAL and REPLACEMENT are ever inserted by any stored
-- procedure today (see usp_Prescription_Finalize/usp_PrescriptionItem_Amend). AMENDMENT
-- and RENEWAL are included in the CHECK constraint for schema completeness - confirmed
-- with the user before implementing - matching how CANCELLED/DISPENSED already sit
-- unreachable in PrescriptionStatus (no Cancel/Dispense action exists yet either); no
-- Renewal feature, and no distinct "Amendment link" concept separate from Replacement,
-- is being built in this pass.
-- UQ_PatientMedicationPrescription_PrescriptionItem: "Prevent orphan relationships" - a
-- PrescriptionItem's PatientMedicationId is fixed at creation (immutable snapshot), so a
-- second link row for the same item would only ever be an accidental duplicate, never a
-- different relationship.
-- Guarded with IF NOT EXISTS so this script can be re-run safely.

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'PatientMedicationPrescription' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
    CREATE TABLE dbo.PatientMedicationPrescription
    (
        PatientMedicationPrescriptionId INT IDENTITY(1,1) NOT NULL,
        PatientMedicationId              INT              NOT NULL,
        PrescriptionId                    INT             NOT NULL,
        PrescriptionItemId                 INT            NOT NULL,
        Scid                                 NVARCHAR(50) NOT NULL,
        RelationshipType                     NVARCHAR(20) NOT NULL,
        CreatedBy                             NVARCHAR(100) NOT NULL,
        CreatedDate                            DATETIME2   NOT NULL CONSTRAINT DF_PatientMedicationPrescription_CreatedDate DEFAULT (SYSUTCDATETIME()),

        CONSTRAINT PK_PatientMedicationPrescription PRIMARY KEY CLUSTERED (PatientMedicationPrescriptionId),
        CONSTRAINT FK_PatientMedicationPrescription_PatientMedication FOREIGN KEY (PatientMedicationId) REFERENCES dbo.PatientMedication (PatientMedicationId),
        CONSTRAINT FK_PatientMedicationPrescription_Prescription FOREIGN KEY (PrescriptionId) REFERENCES dbo.Prescription (PrescriptionId),
        CONSTRAINT FK_PatientMedicationPrescription_PrescriptionItem FOREIGN KEY (PrescriptionItemId) REFERENCES dbo.PrescriptionItem (PrescriptionItemId),
        CONSTRAINT CK_PatientMedicationPrescription_RelationshipType CHECK (RelationshipType IN ('ORIGINAL', 'REPLACEMENT', 'AMENDMENT', 'RENEWAL')),
        CONSTRAINT UQ_PatientMedicationPrescription_PrescriptionItem UNIQUE (PrescriptionItemId)
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_PatientMedicationPrescription_PatientMedication' AND object_id = OBJECT_ID('dbo.PatientMedicationPrescription'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_PatientMedicationPrescription_PatientMedication ON dbo.PatientMedicationPrescription (PatientMedicationId);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_PatientMedicationPrescription_Prescription' AND object_id = OBJECT_ID('dbo.PatientMedicationPrescription'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_PatientMedicationPrescription_Prescription ON dbo.PatientMedicationPrescription (PrescriptionId);
END
GO

-- Backfill: only FINALIZED (non-Draft) prescriptions' items get a link row - link rows
-- are created at Finalize time going forward (usp_Prescription_Finalize), not at
-- CreateDraft/UpdateDraft, so Draft-stage item churn never touches this table (avoiding
-- both FK conflicts with usp_Prescription_UpdateDraft's DELETE+INSERT item-replacement
-- strategy, and noisy pre-finalization link rows for a document that might still be
-- edited several times before anyone reviews it). REPLACEMENT if the item appears as a
-- ReplacementPrescriptionItemId in PrescriptionItemReplacement, else ORIGINAL.
INSERT INTO dbo.PatientMedicationPrescription (PatientMedicationId, PrescriptionId, PrescriptionItemId, Scid, RelationshipType, CreatedBy, CreatedDate)
SELECT
    pi.PatientMedicationId,
    pi.PrescriptionId,
    pi.PrescriptionItemId,
    pi.Scid,
    CASE WHEN pir.ReplacementPrescriptionItemId IS NOT NULL THEN 'REPLACEMENT' ELSE 'ORIGINAL' END,
    pi.CreatedBy,
    pi.CreatedDate
FROM dbo.PrescriptionItem AS pi
INNER JOIN dbo.Prescription AS p ON p.PrescriptionId = pi.PrescriptionId
INNER JOIN dbo.PrescriptionStatus AS ps ON ps.PrescriptionStatusId = p.PrescriptionStatusId
LEFT JOIN dbo.PrescriptionItemReplacement AS pir ON pir.ReplacementPrescriptionItemId = pi.PrescriptionItemId
WHERE pi.PatientMedicationId IS NOT NULL
  AND ps.Code <> 'DRAFT'
  AND NOT EXISTS (
      SELECT 1 FROM dbo.PatientMedicationPrescription AS existing
      WHERE existing.PrescriptionItemId = pi.PrescriptionItemId
  );
GO
