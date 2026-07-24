-- Prescription Item Amendment & Replacement: the clinical "what changed" audit record -
-- Previous*/New* values for every field capable of triggering a replacement (Dose/
-- DoseUnit/Frequency/Quantity/Duration/DurationUnit/Instructions/PRN/Medicine), plus
-- Reason/AmendedBy/AmendedDate. Route is not tracked separately - it is a property of
-- the Medicine catalog entry (MedicineRoute), not something a PatientMedication varies
-- independently, so a route change is already captured as a Medicine change.
-- ReplacementPrescriptionItemId starts NULL and is filled in the same transaction that
-- creates the replacement item (usp_PrescriptionItem_Amend) - this row is the audit
-- trail, distinct from PrescriptionItemReplacement (063+2/065, the relational
-- linking/SCID record) and PrescriptionItemHistory (067, the append-only per-item
-- lifecycle log) - three different concerns, matching this feature's own three
-- separately-named tables. Guarded with IF NOT EXISTS so this script can be re-run
-- safely.

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'PrescriptionItemAmendment' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
    CREATE TABLE dbo.PrescriptionItemAmendment
    (
        PrescriptionItemAmendmentId   INT IDENTITY(1,1) NOT NULL,
        PatientMedicationId            INT              NOT NULL,
        PreviousPrescriptionItemId      INT             NOT NULL,
        ReplacementPrescriptionItemId    INT            NULL,
        PreviousMedicineId                INT           NOT NULL,
        NewMedicineId                      INT          NOT NULL,
        PreviousDose                        DECIMAL(10,3) NOT NULL,
        NewDose                              DECIMAL(10,3) NOT NULL,
        PreviousDoseUnitId                    INT         NOT NULL,
        NewDoseUnitId                          INT        NOT NULL,
        PreviousFrequencyId                     INT       NOT NULL,
        NewFrequencyId                           INT      NOT NULL,
        PreviousQuantity                          DECIMAL(10,2) NOT NULL,
        NewQuantity                                DECIMAL(10,2) NOT NULL,
        PreviousDuration                            INT     NOT NULL,
        NewDuration                                  INT    NOT NULL,
        PreviousDurationUnitId                        INT   NOT NULL,
        NewDurationUnitId                              INT  NOT NULL,
        PreviousInstructions                            NVARCHAR(500) NULL,
        NewInstructions                                  NVARCHAR(500) NULL,
        PreviousPRN                                       BIT NOT NULL,
        NewPRN                                             BIT NOT NULL,
        Reason                                              NVARCHAR(500) NOT NULL,
        AmendedBy                                            NVARCHAR(100) NOT NULL,
        AmendedDate                                           DATETIME2 NOT NULL CONSTRAINT DF_PrescriptionItemAmendment_AmendedDate DEFAULT (SYSUTCDATETIME()),

        CONSTRAINT PK_PrescriptionItemAmendment PRIMARY KEY CLUSTERED (PrescriptionItemAmendmentId),
        CONSTRAINT FK_PrescriptionItemAmendment_PatientMedication FOREIGN KEY (PatientMedicationId) REFERENCES dbo.PatientMedication (PatientMedicationId),
        CONSTRAINT FK_PrescriptionItemAmendment_PreviousItem FOREIGN KEY (PreviousPrescriptionItemId) REFERENCES dbo.PrescriptionItem (PrescriptionItemId),
        CONSTRAINT FK_PrescriptionItemAmendment_ReplacementItem FOREIGN KEY (ReplacementPrescriptionItemId) REFERENCES dbo.PrescriptionItem (PrescriptionItemId),
        CONSTRAINT FK_PrescriptionItemAmendment_PreviousMedicine FOREIGN KEY (PreviousMedicineId) REFERENCES dbo.Medicine (MedicineId),
        CONSTRAINT FK_PrescriptionItemAmendment_NewMedicine FOREIGN KEY (NewMedicineId) REFERENCES dbo.Medicine (MedicineId)
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_PrescriptionItemAmendment_PreviousItem' AND object_id = OBJECT_ID('dbo.PrescriptionItemAmendment'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_PrescriptionItemAmendment_PreviousItem ON dbo.PrescriptionItemAmendment (PreviousPrescriptionItemId);
END
GO
