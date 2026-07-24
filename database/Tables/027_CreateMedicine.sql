-- Medicine Management: new table, master/reference data (database-spec.md section 1) -
-- not owned by any Patient, not yet referenced by any Prescription/PrescriptionItem
-- table (neither exists yet). Reuses the existing dbo.MedicineForm/dbo.MedicineRoute
-- lookup tables via MedicineFormId/MedicineRouteId - no duplicate lookup tables are
-- introduced. dbo.DoseUnit/dbo.Frequency/dbo.DurationUnit are intentionally NOT
-- referenced here - per the approved spec, they belong to the future PrescriptionItem
-- table's per-prescription dosing details, not to the medicine catalog itself.
-- Guarded with IF NOT EXISTS so this script can be re-run safely.

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'Medicine' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
    CREATE TABLE dbo.Medicine
    (
        MedicineId        INT IDENTITY(1,1) NOT NULL,
        MedicineCode      NVARCHAR(20)       NOT NULL,
        MedicineName      NVARCHAR(200)      NOT NULL,
        GenericName       NVARCHAR(200)      NOT NULL,
        BrandName         NVARCHAR(200)      NULL,
        Strength          NVARCHAR(50)       NOT NULL,
        MedicineFormId    INT                NOT NULL,
        MedicineRouteId   INT                NOT NULL,
        Manufacturer      NVARCHAR(200)      NULL,
        ATCCode           NVARCHAR(20)       NULL,
        IsControlledDrug  BIT                NOT NULL CONSTRAINT DF_Medicine_IsControlledDrug DEFAULT (0),
        IsActive          BIT                NOT NULL CONSTRAINT DF_Medicine_IsActive DEFAULT (1),
        Notes             NVARCHAR(MAX)      NULL,
        RowVersion        ROWVERSION,
        CreatedDate       DATETIME2          NOT NULL CONSTRAINT DF_Medicine_CreatedDate DEFAULT (SYSUTCDATETIME()),
        CreatedBy         NVARCHAR(100)      NOT NULL,
        UpdatedDate       DATETIME2          NULL,
        UpdatedBy         NVARCHAR(100)      NULL,
        IsDeleted         BIT                NOT NULL CONSTRAINT DF_Medicine_IsDeleted DEFAULT (0),

        CONSTRAINT PK_Medicine PRIMARY KEY CLUSTERED (MedicineId),
        CONSTRAINT UQ_Medicine_MedicineCode UNIQUE (MedicineCode),
        CONSTRAINT UQ_Medicine_Name_Strength_Form UNIQUE (MedicineName, Strength, MedicineFormId),
        CONSTRAINT FK_Medicine_MedicineForm FOREIGN KEY (MedicineFormId) REFERENCES dbo.MedicineForm (MedicineFormId),
        CONSTRAINT FK_Medicine_MedicineRoute FOREIGN KEY (MedicineRouteId) REFERENCES dbo.MedicineRoute (MedicineRouteId),
        CONSTRAINT CK_Medicine_ATCCode CHECK (ATCCode IS NULL OR ATCCode LIKE '[A-Z][0-9][0-9][A-Z][A-Z][0-9][0-9]')
    );
END
GO

-- IX_Medicine_MedicineName is deliberately not created as its own index: the composite
-- UQ_Medicine_Name_Strength_Form unique constraint's backing index already leads with
-- MedicineName, so a query filtering by MedicineName alone can use that index's
-- leftmost-column prefix. A separate single-column index would just duplicate it.

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Medicine_GenericName' AND object_id = OBJECT_ID('dbo.Medicine'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_Medicine_GenericName ON dbo.Medicine (GenericName);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Medicine_BrandName' AND object_id = OBJECT_ID('dbo.Medicine'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_Medicine_BrandName ON dbo.Medicine (BrandName);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Medicine_IsActive' AND object_id = OBJECT_ID('dbo.Medicine'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_Medicine_IsActive ON dbo.Medicine (IsActive);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Medicine_MedicineFormId' AND object_id = OBJECT_ID('dbo.Medicine'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_Medicine_MedicineFormId ON dbo.Medicine (MedicineFormId);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Medicine_MedicineRouteId' AND object_id = OBJECT_ID('dbo.Medicine'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_Medicine_MedicineRouteId ON dbo.Medicine (MedicineRouteId);
END
GO
