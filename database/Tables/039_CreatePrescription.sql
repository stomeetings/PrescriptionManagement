-- Prescription Management Phase 1 (database-spec.md section 3.1): the persisted header
-- row for a Prescription at any status (Draft through Dispensed/Cancelled/Failed/
-- Expired - see PrescriptionStatus, already created/seeded by 003). Not
-- "PrescriptionDraft" - CLAUDE.md already fixes this entity's name; "Draft" is a status
-- value this table's PrescriptionStatusId can hold, not a separate table. Reuses
-- existing Patient, UserAccount, and PrescriptionStatus tables. Guarded with
-- IF NOT EXISTS so this script can be re-run safely.

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'Prescription' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
    CREATE TABLE dbo.Prescription
    (
        PrescriptionId          INT IDENTITY(1,1)  NOT NULL,
        PrescriptionNumber      NVARCHAR(50)        NOT NULL,
        DraftPrescriptionId     UNIQUEIDENTIFIER    NOT NULL,
        PatientId                INT               NOT NULL,
        ProviderUserAccountId    INT               NOT NULL,
        PrescriptionStatusId     INT               NOT NULL,
        ClinicalNotes            NVARCHAR(MAX)     NULL,
        Xhtml                    NVARCHAR(MAX)     NOT NULL,
        IssueDate                DATE              NOT NULL,
        ExpiryDate               DATE              NULL,
        RowVersion               ROWVERSION,
        CreatedDate              DATETIME2         NOT NULL CONSTRAINT DF_Prescription_CreatedDate DEFAULT (SYSUTCDATETIME()),
        CreatedBy                NVARCHAR(100)     NOT NULL,
        UpdatedDate              DATETIME2         NULL,
        UpdatedBy                NVARCHAR(100)     NULL,
        IsDeleted                BIT               NOT NULL CONSTRAINT DF_Prescription_IsDeleted DEFAULT (0),

        CONSTRAINT PK_Prescription PRIMARY KEY CLUSTERED (PrescriptionId),
        CONSTRAINT UQ_Prescription_PrescriptionNumber UNIQUE (PrescriptionNumber),
        CONSTRAINT UQ_Prescription_DraftPrescriptionId UNIQUE (DraftPrescriptionId),
        CONSTRAINT FK_Prescription_Patient FOREIGN KEY (PatientId) REFERENCES dbo.Patient (PatientId),
        CONSTRAINT FK_Prescription_ProviderUserAccount FOREIGN KEY (ProviderUserAccountId) REFERENCES dbo.UserAccount (UserAccountId),
        CONSTRAINT FK_Prescription_PrescriptionStatus FOREIGN KEY (PrescriptionStatusId) REFERENCES dbo.PrescriptionStatus (PrescriptionStatusId),
        CONSTRAINT CK_Prescription_ExpiryDate CHECK (ExpiryDate IS NULL OR ExpiryDate >= IssueDate)
    );
END
GO

-- Indexes, matching the approved database-spec.md section 6.
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Prescription_Patient' AND object_id = OBJECT_ID('dbo.Prescription'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_Prescription_Patient ON dbo.Prescription (PatientId);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Prescription_Status' AND object_id = OBJECT_ID('dbo.Prescription'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_Prescription_Status ON dbo.Prescription (PrescriptionStatusId);
END
GO
