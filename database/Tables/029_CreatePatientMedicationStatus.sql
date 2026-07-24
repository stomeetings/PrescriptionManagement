-- Patient Medication Management: new dedicated lookup table (Code/DisplayText/
-- DisplayOrder/IsActive/audit template, matching every other Lookup Management table
-- exactly - see docs/Lookup/database-spec.md section 4). Not a generic "LookupValue"
-- table - no such table exists anywhere in this schema (Lookup Management explicitly
-- rejected that model). Seed values (ACTIVE, STOPPED) are documented in
-- docs/patient-medications/database-spec.md section 3.3 but are NOT inserted by this
-- script - seed data is a later step.

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'PatientMedicationStatus' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
    CREATE TABLE dbo.PatientMedicationStatus
    (
        PatientMedicationStatusId INT IDENTITY(1,1) NOT NULL,
        Code                      NVARCHAR(50)       NOT NULL,
        DisplayText               NVARCHAR(150)      NOT NULL,
        DisplayOrder              INT                NOT NULL,
        IsActive                  BIT                NOT NULL CONSTRAINT DF_PatientMedicationStatus_IsActive DEFAULT (1),
        CreatedDate               DATETIME2          NOT NULL CONSTRAINT DF_PatientMedicationStatus_CreatedDate DEFAULT (SYSUTCDATETIME()),
        CreatedBy                 NVARCHAR(100)      NOT NULL,
        UpdatedDate               DATETIME2          NULL,
        UpdatedBy                 NVARCHAR(100)      NULL,
        IsDeleted                 BIT                NOT NULL CONSTRAINT DF_PatientMedicationStatus_IsDeleted DEFAULT (0),

        CONSTRAINT PK_PatientMedicationStatus PRIMARY KEY CLUSTERED (PatientMedicationStatusId),
        CONSTRAINT UQ_PatientMedicationStatus_Code UNIQUE (Code)
    );
END
GO
