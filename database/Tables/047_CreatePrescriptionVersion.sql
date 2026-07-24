-- Step 18.7 (Draft History & Versioning): full point-in-time snapshot of a Prescription
-- at a given VersionNumber. "No version should ever be overwritten" - this table is
-- append-only; nothing in this project's Application/Repository layer should ever issue
-- an UPDATE or DELETE against it (matching PatientMedicationHistory/PrescriptionAudit's
-- identical append-only precedent). Xhtml is snapshotted per-version (not just per-
-- Prescription) so a historical version can be viewed/printed exactly as it looked at
-- that point, independent of what the live Prescription looks like now.
-- Guarded with IF NOT EXISTS so this script can be re-run safely.

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'PrescriptionVersion' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
    CREATE TABLE dbo.PrescriptionVersion
    (
        PrescriptionVersionId INT IDENTITY(1,1) NOT NULL,
        PrescriptionId         INT              NOT NULL,
        VersionNumber           INT             NOT NULL,
        ClinicalNotes            NVARCHAR(MAX)  NULL,
        Xhtml                     NVARCHAR(MAX) NOT NULL,
        PrescriptionStatusId       INT          NOT NULL,
        ChangeSummary                NVARCHAR(500) NULL,
        CreatedDate                   DATETIME2  NOT NULL CONSTRAINT DF_PrescriptionVersion_CreatedDate DEFAULT (SYSUTCDATETIME()),
        CreatedBy                      NVARCHAR(100) NOT NULL,

        CONSTRAINT PK_PrescriptionVersion PRIMARY KEY CLUSTERED (PrescriptionVersionId),
        CONSTRAINT UQ_PrescriptionVersion_Prescription_VersionNumber UNIQUE (PrescriptionId, VersionNumber),
        CONSTRAINT FK_PrescriptionVersion_Prescription FOREIGN KEY (PrescriptionId) REFERENCES dbo.Prescription (PrescriptionId),
        CONSTRAINT FK_PrescriptionVersion_PrescriptionStatus FOREIGN KEY (PrescriptionStatusId) REFERENCES dbo.PrescriptionStatus (PrescriptionStatusId),
        CONSTRAINT CK_PrescriptionVersion_VersionNumber CHECK (VersionNumber >= 1)
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_PrescriptionVersion_Prescription' AND object_id = OBJECT_ID('dbo.PrescriptionVersion'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_PrescriptionVersion_Prescription ON dbo.PrescriptionVersion (PrescriptionId);
END
GO
