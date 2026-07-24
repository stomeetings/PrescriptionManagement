-- Patient Medication Management: new dedicated lookup table, same pattern as
-- PatientMedicationStatus (029). Seed values (MANUAL_ENTRY, PRESCRIPTION, IMPORTED) are
-- documented in docs/patient-medications/database-spec.md section 3.4 but are NOT
-- inserted by this script - seed data is a later step.

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'PatientMedicationSource' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
    CREATE TABLE dbo.PatientMedicationSource
    (
        PatientMedicationSourceId INT IDENTITY(1,1) NOT NULL,
        Code                      NVARCHAR(50)       NOT NULL,
        DisplayText               NVARCHAR(150)      NOT NULL,
        DisplayOrder              INT                NOT NULL,
        IsActive                  BIT                NOT NULL CONSTRAINT DF_PatientMedicationSource_IsActive DEFAULT (1),
        CreatedDate               DATETIME2          NOT NULL CONSTRAINT DF_PatientMedicationSource_CreatedDate DEFAULT (SYSUTCDATETIME()),
        CreatedBy                 NVARCHAR(100)      NOT NULL,
        UpdatedDate               DATETIME2          NULL,
        UpdatedBy                 NVARCHAR(100)      NULL,
        IsDeleted                 BIT                NOT NULL CONSTRAINT DF_PatientMedicationSource_IsDeleted DEFAULT (0),

        CONSTRAINT PK_PatientMedicationSource PRIMARY KEY CLUSTERED (PatientMedicationSourceId),
        CONSTRAINT UQ_PatientMedicationSource_Code UNIQUE (Code)
    );
END
GO
