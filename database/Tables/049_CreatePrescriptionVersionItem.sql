-- Step 18.7: mirrors PrescriptionItem's exact shape (033/041), scoped to a
-- PrescriptionVersionId instead of a PrescriptionId - a full per-version snapshot of
-- every medication line, needed for the Comparison View to diff two versions'
-- medications without reconstructing state from the live PrescriptionItem table (which
-- only ever reflects the CURRENT version's items). Same snapshot-columns-alongside-FK
-- reasoning as PrescriptionItem (database-spec.md section 2 item 7) - a later Medicine
-- catalog correction must not retroactively change how a historical version displays.
-- Guarded with IF NOT EXISTS so this script can be re-run safely.

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'PrescriptionVersionItem' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
    CREATE TABLE dbo.PrescriptionVersionItem
    (
        PrescriptionVersionItemId INT IDENTITY(1,1) NOT NULL,
        PrescriptionVersionId      INT              NOT NULL,
        PatientMedicationId         INT             NULL,
        MedicineId                   INT            NOT NULL,
        MedicineNameSnapshot          NVARCHAR(200) NOT NULL,
        GenericNameSnapshot            NVARCHAR(200) NOT NULL,
        StrengthSnapshot                 NVARCHAR(50) NOT NULL,
        DosageFormSnapshot                NVARCHAR(150) NOT NULL,
        RouteSnapshot                      NVARCHAR(150) NOT NULL,
        Dose                                DECIMAL(10,3) NOT NULL,
        DoseUnitId                           INT           NOT NULL,
        DoseUnitSnapshot                      NVARCHAR(150) NOT NULL,
        FrequencyId                            INT          NOT NULL,
        FrequencySnapshot                       NVARCHAR(150) NOT NULL,
        Duration                                 INT         NOT NULL,
        DurationUnitId                            INT        NOT NULL,
        DurationUnitSnapshot                       NVARCHAR(150) NOT NULL,
        Quantity                                    DECIMAL(10,2) NOT NULL,
        Instructions                                 NVARCHAR(500) NOT NULL,
        PRN                                           BIT NOT NULL CONSTRAINT DF_PrescriptionVersionItem_PRN DEFAULT (0),

        CONSTRAINT PK_PrescriptionVersionItem PRIMARY KEY CLUSTERED (PrescriptionVersionItemId),
        CONSTRAINT FK_PrescriptionVersionItem_PrescriptionVersion FOREIGN KEY (PrescriptionVersionId) REFERENCES dbo.PrescriptionVersion (PrescriptionVersionId),
        CONSTRAINT FK_PrescriptionVersionItem_PatientMedication FOREIGN KEY (PatientMedicationId) REFERENCES dbo.PatientMedication (PatientMedicationId),
        CONSTRAINT FK_PrescriptionVersionItem_Medicine FOREIGN KEY (MedicineId) REFERENCES dbo.Medicine (MedicineId),
        CONSTRAINT FK_PrescriptionVersionItem_DoseUnit FOREIGN KEY (DoseUnitId) REFERENCES dbo.DoseUnit (DoseUnitId),
        CONSTRAINT FK_PrescriptionVersionItem_Frequency FOREIGN KEY (FrequencyId) REFERENCES dbo.Frequency (FrequencyId),
        CONSTRAINT FK_PrescriptionVersionItem_DurationUnit FOREIGN KEY (DurationUnitId) REFERENCES dbo.DurationUnit (DurationUnitId),
        CONSTRAINT CK_PrescriptionVersionItem_Quantity CHECK (Quantity > 0),
        CONSTRAINT CK_PrescriptionVersionItem_Duration CHECK (Duration >= 0),
        CONSTRAINT CK_PrescriptionVersionItem_Dose CHECK (Dose >= 0)
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_PrescriptionVersionItem_PrescriptionVersion' AND object_id = OBJECT_ID('dbo.PrescriptionVersionItem'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_PrescriptionVersionItem_PrescriptionVersion ON dbo.PrescriptionVersionItem (PrescriptionVersionId);
END
GO
