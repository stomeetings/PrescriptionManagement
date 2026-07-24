-- Prescription Management Phase 1 (database-spec.md section 3.2): one prescribed
-- medicine line per row. Every catalog/lookup-derived display value is snapshotted as
-- plain text (*Snapshot columns), in addition to keeping its FK - a later correction to
-- Medicine/DoseUnit/Frequency/DurationUnit catalog data must never retroactively change
-- how an already-saved Prescription displays (database-spec.md section 2 item 7).
-- Immutable once written - no UpdatedDate/UpdatedBy/IsDeleted (section 3.2's own note).
-- Guarded with IF NOT EXISTS so this script can be re-run safely.

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'PrescriptionItem' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
    CREATE TABLE dbo.PrescriptionItem
    (
        PrescriptionItemId     INT IDENTITY(1,1) NOT NULL,
        PrescriptionId          INT              NOT NULL,
        PatientMedicationId     INT              NULL,
        MedicineId               INT             NOT NULL,
        MedicineNameSnapshot     NVARCHAR(200)    NOT NULL,
        GenericNameSnapshot      NVARCHAR(200)    NOT NULL,
        StrengthSnapshot         NVARCHAR(50)     NOT NULL,
        DosageFormSnapshot       NVARCHAR(150)    NOT NULL,
        RouteSnapshot            NVARCHAR(150)    NOT NULL,
        Dose                     DECIMAL(10,3)    NOT NULL,
        DoseUnitId               INT              NOT NULL,
        DoseUnitSnapshot         NVARCHAR(150)    NOT NULL,
        FrequencyId              INT              NOT NULL,
        FrequencySnapshot        NVARCHAR(150)    NOT NULL,
        Duration                 INT              NOT NULL,
        DurationUnitId           INT              NOT NULL,
        DurationUnitSnapshot     NVARCHAR(150)    NOT NULL,
        Quantity                 DECIMAL(10,2)    NOT NULL,
        Instructions             NVARCHAR(500)    NOT NULL,
        PRN                      BIT              NOT NULL CONSTRAINT DF_PrescriptionItem_PRN DEFAULT (0),
        CreatedDate              DATETIME2        NOT NULL CONSTRAINT DF_PrescriptionItem_CreatedDate DEFAULT (SYSUTCDATETIME()),
        CreatedBy                NVARCHAR(100)    NOT NULL,

        CONSTRAINT PK_PrescriptionItem PRIMARY KEY CLUSTERED (PrescriptionItemId),
        CONSTRAINT FK_PrescriptionItem_Prescription FOREIGN KEY (PrescriptionId) REFERENCES dbo.Prescription (PrescriptionId),
        CONSTRAINT FK_PrescriptionItem_PatientMedication FOREIGN KEY (PatientMedicationId) REFERENCES dbo.PatientMedication (PatientMedicationId),
        CONSTRAINT FK_PrescriptionItem_Medicine FOREIGN KEY (MedicineId) REFERENCES dbo.Medicine (MedicineId),
        CONSTRAINT FK_PrescriptionItem_DoseUnit FOREIGN KEY (DoseUnitId) REFERENCES dbo.DoseUnit (DoseUnitId),
        CONSTRAINT FK_PrescriptionItem_Frequency FOREIGN KEY (FrequencyId) REFERENCES dbo.Frequency (FrequencyId),
        CONSTRAINT FK_PrescriptionItem_DurationUnit FOREIGN KEY (DurationUnitId) REFERENCES dbo.DurationUnit (DurationUnitId),
        CONSTRAINT CK_PrescriptionItem_Quantity CHECK (Quantity > 0),
        CONSTRAINT CK_PrescriptionItem_Duration CHECK (Duration >= 0),
        CONSTRAINT CK_PrescriptionItem_Dose CHECK (Dose >= 0)
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_PrescriptionItem_Prescription' AND object_id = OBJECT_ID('dbo.PrescriptionItem'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_PrescriptionItem_Prescription ON dbo.PrescriptionItem (PrescriptionId);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_PrescriptionItem_PatientMedication' AND object_id = OBJECT_ID('dbo.PrescriptionItem'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_PrescriptionItem_PatientMedication ON dbo.PrescriptionItem (PatientMedicationId);
END
GO
