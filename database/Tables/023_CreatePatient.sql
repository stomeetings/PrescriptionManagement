-- Patient Management: new table, no existing table models a Patient (unlike User
-- Management's reuse of UserAccount). Reuses the existing dbo.Gender lookup table via
-- GenderId - no second gender table is introduced. No Country lookup table exists yet
-- (see database-spec.md section 1 / Assumptions 10), so Country is plain text, not a FK.
-- Guarded with IF NOT EXISTS so this script can be re-run safely.

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'Patient' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
    CREATE TABLE dbo.Patient
    (
        PatientId       INT IDENTITY(1,1) NOT NULL,
        PatientNumber   NVARCHAR(20)       NOT NULL,
        FirstName       NVARCHAR(100)      NOT NULL,
        LastName        NVARCHAR(100)      NOT NULL,
        PreferredName   NVARCHAR(100)      NULL,
        DateOfBirth     DATE               NOT NULL,
        GenderId        INT                NOT NULL,
        MobileNumber    NVARCHAR(20)       NULL,
        Email           NVARCHAR(256)      NULL,
        AddressLine1    NVARCHAR(200)      NULL,
        AddressLine2    NVARCHAR(200)      NULL,
        City            NVARCHAR(100)      NULL,
        Region          NVARCHAR(100)      NULL,
        PostalCode      NVARCHAR(20)       NULL,
        Country         NVARCHAR(100)      NULL,
        NHINumber       NVARCHAR(20)       NULL,
        NZMCNumber      NVARCHAR(20)       NULL,
        IsActive        BIT                NOT NULL CONSTRAINT DF_Patient_IsActive DEFAULT (1),
        Notes           NVARCHAR(MAX)      NULL,
        RowVersion      ROWVERSION,
        CreatedDate     DATETIME2          NOT NULL CONSTRAINT DF_Patient_CreatedDate DEFAULT (SYSUTCDATETIME()),
        CreatedBy       NVARCHAR(100)      NOT NULL,
        UpdatedDate     DATETIME2          NULL,
        UpdatedBy       NVARCHAR(100)      NULL,
        IsDeleted       BIT                NOT NULL CONSTRAINT DF_Patient_IsDeleted DEFAULT (0),

        CONSTRAINT PK_Patient PRIMARY KEY CLUSTERED (PatientId),
        CONSTRAINT UQ_Patient_PatientNumber UNIQUE (PatientNumber),
        CONSTRAINT UQ_Patient_NHINumber UNIQUE (NHINumber),
        CONSTRAINT FK_Patient_Gender FOREIGN KEY (GenderId) REFERENCES dbo.Gender (GenderId)
    );
END
GO

-- No CHECK constraint on DateOfBirth ("cannot be in the future"), matching the approved
-- database spec's explicit decision (section 5): the related "at least one day old" rule
-- is still unconfirmed (business-spec review flagged it as a possible newborn-exclusion
-- bug), so enforcement stays in the Application layer until that rule is resolved.

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Patient_LastName_FirstName' AND object_id = OBJECT_ID('dbo.Patient'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_Patient_LastName_FirstName ON dbo.Patient (LastName, FirstName);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Patient_MobileNumber' AND object_id = OBJECT_ID('dbo.Patient'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_Patient_MobileNumber ON dbo.Patient (MobileNumber);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Patient_Email' AND object_id = OBJECT_ID('dbo.Patient'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_Patient_Email ON dbo.Patient (Email);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Patient_IsActive' AND object_id = OBJECT_ID('dbo.Patient'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_Patient_IsActive ON dbo.Patient (IsActive);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Patient_GenderId' AND object_id = OBJECT_ID('dbo.Patient'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_Patient_GenderId ON dbo.Patient (GenderId);
END
GO
