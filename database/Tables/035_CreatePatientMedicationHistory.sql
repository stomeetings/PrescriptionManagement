-- Patient Medication Management: append-only audit-log table (database-spec.md section
-- 3.2) - the first dedicated history table in this project. Complements, rather than
-- duplicates, PatientMedication's own row-per-Stop/Resume-cycle history: this table
-- captures field-level edits to a still-current record (an Edit Medication action)
-- that the row-chain model does not.

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'PatientMedicationHistory' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
    CREATE TABLE dbo.PatientMedicationHistory
    (
        HistoryId           INT IDENTITY(1,1) NOT NULL,
        PatientMedicationId INT               NOT NULL,
        Action              NVARCHAR(50)      NOT NULL,
        PreviousValues       NVARCHAR(MAX)     NULL,
        NewValues            NVARCHAR(MAX)     NULL,
        ChangedBy            NVARCHAR(100)     NOT NULL,
        ChangedDate          DATETIME2         NOT NULL CONSTRAINT DF_PatientMedicationHistory_ChangedDate DEFAULT (SYSUTCDATETIME()),

        CONSTRAINT PK_PatientMedicationHistory PRIMARY KEY CLUSTERED (HistoryId),
        CONSTRAINT FK_PatientMedicationHistory_PatientMedication FOREIGN KEY (PatientMedicationId) REFERENCES dbo.PatientMedication (PatientMedicationId),
        -- Small, genuinely fixed set of values (unlike lookup Code columns elsewhere in
        -- this project, which deliberately have no format CHECK because they vary too
        -- much by category) - a CHECK constraint is appropriate here.
        CONSTRAINT CK_PatientMedicationHistory_Action CHECK (Action IN ('CREATED', 'UPDATED', 'STOPPED', 'RESUMED')),
        -- SQL Server 2022 has no native JSON column type, so JSON is stored as
        -- ISJSON-validated NVARCHAR(MAX), per the approved database-spec.md section 3.2.
        CONSTRAINT CK_PatientMedicationHistory_PreviousValuesJson CHECK (PreviousValues IS NULL OR ISJSON(PreviousValues) = 1),
        CONSTRAINT CK_PatientMedicationHistory_NewValuesJson CHECK (NewValues IS NULL OR ISJSON(NewValues) = 1)
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_PatientMedicationHistory_PatientMedicationId' AND object_id = OBJECT_ID('dbo.PatientMedicationHistory'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_PatientMedicationHistory_PatientMedicationId ON dbo.PatientMedicationHistory (PatientMedicationId);
END
GO
