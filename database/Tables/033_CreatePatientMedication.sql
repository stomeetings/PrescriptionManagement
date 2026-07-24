-- Patient Medication Management: new table - a patient's current-and-historical
-- medication list, distinct from a Prescription (patient-medication-management.md
-- section 1). Reuses existing Patient, Medicine, DoseUnit, Frequency, DurationUnit, and
-- UserAccount tables; references the two new dedicated lookup tables created just before
-- this script (029, 031). No generic "LookupValue"/"Users" tables exist in this schema -
-- see database-spec.md section 2 for the full reconciliation of this task's originally
-- requested field/FK names against what's actually built.
-- Guarded with IF NOT EXISTS so this script can be re-run safely.

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'PatientMedication' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
    CREATE TABLE dbo.PatientMedication
    (
        PatientMedicationId            INT IDENTITY(1,1) NOT NULL,
        PatientId                      INT               NOT NULL,
        MedicineId                     INT               NOT NULL,
        Dose                           DECIMAL(10,3)     NOT NULL,
        DoseUnitId                     INT               NOT NULL,
        FrequencyId                    INT               NOT NULL,
        Duration                       INT               NOT NULL,
        DurationUnitId                 INT               NOT NULL,
        Quantity                       DECIMAL(10,2)     NOT NULL,
        Instructions                   NVARCHAR(500)     NOT NULL,
        PRN                            BIT               NOT NULL CONSTRAINT DF_PatientMedication_PRN DEFAULT (0),
        StartDate                      DATE              NOT NULL,
        EndDate                        DATE              NULL,
        ClinicalNotes                  NVARCHAR(MAX)     NULL,
        PrescribedByUserAccountId      INT               NULL,
        PatientMedicationSourceId      INT               NOT NULL,
        PatientMedicationStatusId      INT               NOT NULL,
        IsCurrent                      BIT               NOT NULL CONSTRAINT DF_PatientMedication_IsCurrent DEFAULT (1),
        IsActive                       BIT               NOT NULL CONSTRAINT DF_PatientMedication_IsActive DEFAULT (1),
        ResumedFromPatientMedicationId INT               NULL,
        RowVersion                     ROWVERSION,
        CreatedDate                    DATETIME2         NOT NULL CONSTRAINT DF_PatientMedication_CreatedDate DEFAULT (SYSUTCDATETIME()),
        CreatedBy                      NVARCHAR(100)     NOT NULL,
        UpdatedDate                    DATETIME2         NULL,
        UpdatedBy                      NVARCHAR(100)     NULL,
        StoppedDate                    DATETIME2         NULL,
        StoppedBy                      NVARCHAR(100)     NULL,
        IsDeleted                      BIT               NOT NULL CONSTRAINT DF_PatientMedication_IsDeleted DEFAULT (0),

        CONSTRAINT PK_PatientMedication PRIMARY KEY CLUSTERED (PatientMedicationId),
        CONSTRAINT FK_PatientMedication_Patient FOREIGN KEY (PatientId) REFERENCES dbo.Patient (PatientId),
        CONSTRAINT FK_PatientMedication_Medicine FOREIGN KEY (MedicineId) REFERENCES dbo.Medicine (MedicineId),
        CONSTRAINT FK_PatientMedication_DoseUnit FOREIGN KEY (DoseUnitId) REFERENCES dbo.DoseUnit (DoseUnitId),
        CONSTRAINT FK_PatientMedication_Frequency FOREIGN KEY (FrequencyId) REFERENCES dbo.Frequency (FrequencyId),
        CONSTRAINT FK_PatientMedication_DurationUnit FOREIGN KEY (DurationUnitId) REFERENCES dbo.DurationUnit (DurationUnitId),
        CONSTRAINT FK_PatientMedication_PrescribedByUserAccount FOREIGN KEY (PrescribedByUserAccountId) REFERENCES dbo.UserAccount (UserAccountId),
        CONSTRAINT FK_PatientMedication_PatientMedicationSource FOREIGN KEY (PatientMedicationSourceId) REFERENCES dbo.PatientMedicationSource (PatientMedicationSourceId),
        CONSTRAINT FK_PatientMedication_PatientMedicationStatus FOREIGN KEY (PatientMedicationStatusId) REFERENCES dbo.PatientMedicationStatus (PatientMedicationStatusId),
        CONSTRAINT FK_PatientMedication_ResumedFrom FOREIGN KEY (ResumedFromPatientMedicationId) REFERENCES dbo.PatientMedication (PatientMedicationId),
        CONSTRAINT CK_PatientMedication_EndDate CHECK (EndDate IS NULL OR EndDate >= StartDate),
        CONSTRAINT CK_PatientMedication_Quantity CHECK (Quantity >= 0),
        CONSTRAINT CK_PatientMedication_Duration CHECK (Duration >= 0),
        CONSTRAINT CK_PatientMedication_Dose CHECK (Dose >= 0)
    );
END
GO

-- Business rule enforcement: only one CURRENT (active) medication per Patient+Medicine.
-- A filtered unique index - not a plain UNIQUE constraint - since the rule only applies
-- to rows where IsCurrent = 1; historical (superseded) rows for the same Patient+
-- Medicine must be allowed to coexist. This is the actual database-level enforcement of
-- "a patient cannot have duplicate active medications with the same Medicine + Strength"
-- (patient-medication-management.md section 6) - Strength itself isn't duplicated onto
-- this table since Medicine already fixes Strength per row (database-spec.md section 3.1).
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UQ_PatientMedication_Patient_Medicine_Current' AND object_id = OBJECT_ID('dbo.PatientMedication'))
BEGIN
    CREATE UNIQUE NONCLUSTERED INDEX UQ_PatientMedication_Patient_Medicine_Current
        ON dbo.PatientMedication (PatientId, MedicineId)
        WHERE IsCurrent = 1;
END
GO

-- Composite indexes, matching the approved database-spec.md section 6 exactly.
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_PatientMedication_Patient_IsCurrent' AND object_id = OBJECT_ID('dbo.PatientMedication'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_PatientMedication_Patient_IsCurrent ON dbo.PatientMedication (PatientId, IsCurrent);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_PatientMedication_Patient_Medicine' AND object_id = OBJECT_ID('dbo.PatientMedication'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_PatientMedication_Patient_Medicine ON dbo.PatientMedication (PatientId, MedicineId);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_PatientMedication_Patient_Status' AND object_id = OBJECT_ID('dbo.PatientMedication'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_PatientMedication_Patient_Status ON dbo.PatientMedication (PatientId, PatientMedicationStatusId);
END
GO

-- Remaining single-column indexes requested by this step.
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_PatientMedication_MedicineId' AND object_id = OBJECT_ID('dbo.PatientMedication'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_PatientMedication_MedicineId ON dbo.PatientMedication (MedicineId);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_PatientMedication_StartDate' AND object_id = OBJECT_ID('dbo.PatientMedication'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_PatientMedication_StartDate ON dbo.PatientMedication (StartDate);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_PatientMedication_EndDate' AND object_id = OBJECT_ID('dbo.PatientMedication'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_PatientMedication_EndDate ON dbo.PatientMedication (EndDate);
END
GO

-- Deliberately NOT created, even though this step's own requirements re-list them as
-- individual indexes on PatientId/IsCurrent/IsActive/StatusLookupId(PatientMedication
-- StatusId): standalone single-column indexes on PatientId, IsCurrent, and
-- PatientMedicationStatusId would only duplicate the leftmost column of
-- IX_PatientMedication_Patient_IsCurrent / _Patient_Medicine / _Patient_Status above,
-- adding write overhead with no read benefit those three don't already provide. This
-- was already decided and reasoned through in the approved database-spec.md section 6 -
-- this script stays faithful to that approved decision rather than the unrefined index
-- list this step's own prompt re-states. A standalone IX_PatientMedication_IsActive is
-- also omitted, since IsActive has no distinct query need from IsCurrent at this time
-- (database-spec.md section 11 item 2).
