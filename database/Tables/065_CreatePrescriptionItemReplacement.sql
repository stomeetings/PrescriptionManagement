-- Prescription Item Amendment & Replacement: the relational "which old item/prescription
-- was replaced by which new item/prescription, with which SCIDs" record - the
-- "Relationships" data this feature's own spec names explicitly. Distinct from
-- PrescriptionItemAmendment (063, the clinical before/after diff) and
-- PrescriptionItemHistory (067, the append-only per-item lifecycle log).
-- UQ_PrescriptionItemReplacement_PreviousItem: an item can only ever be superseded once -
-- a later amendment against the same PatientMedicationId chains from the NEW active item
-- (found via usp_PrescriptionItem_FindActiveByPatientMedication's ItemStatus='ACTIVE'
-- filter), not by replacing an already-superseded row again.
-- Guarded with IF NOT EXISTS so this script can be re-run safely.

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'PrescriptionItemReplacement' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
    CREATE TABLE dbo.PrescriptionItemReplacement
    (
        PrescriptionItemReplacementId INT IDENTITY(1,1) NOT NULL,
        PreviousPrescriptionId         INT              NOT NULL,
        PreviousPrescriptionItemId      INT             NOT NULL,
        ReplacementPrescriptionId        INT            NOT NULL,
        ReplacementPrescriptionItemId     INT           NOT NULL,
        PreviousScid                       NVARCHAR(50) NOT NULL,
        ReplacementScid                     NVARCHAR(50) NOT NULL,
        Reason                               NVARCHAR(500) NOT NULL,
        CreatedBy                             NVARCHAR(100) NOT NULL,
        CreatedDate                            DATETIME2  NOT NULL CONSTRAINT DF_PrescriptionItemReplacement_CreatedDate DEFAULT (SYSUTCDATETIME()),

        CONSTRAINT PK_PrescriptionItemReplacement PRIMARY KEY CLUSTERED (PrescriptionItemReplacementId),
        CONSTRAINT FK_PrescriptionItemReplacement_PreviousPrescription FOREIGN KEY (PreviousPrescriptionId) REFERENCES dbo.Prescription (PrescriptionId),
        CONSTRAINT FK_PrescriptionItemReplacement_PreviousItem FOREIGN KEY (PreviousPrescriptionItemId) REFERENCES dbo.PrescriptionItem (PrescriptionItemId),
        CONSTRAINT FK_PrescriptionItemReplacement_ReplacementPrescription FOREIGN KEY (ReplacementPrescriptionId) REFERENCES dbo.Prescription (PrescriptionId),
        CONSTRAINT FK_PrescriptionItemReplacement_ReplacementItem FOREIGN KEY (ReplacementPrescriptionItemId) REFERENCES dbo.PrescriptionItem (PrescriptionItemId),
        CONSTRAINT UQ_PrescriptionItemReplacement_PreviousItem UNIQUE (PreviousPrescriptionItemId)
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_PrescriptionItemReplacement_ReplacementItem' AND object_id = OBJECT_ID('dbo.PrescriptionItemReplacement'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_PrescriptionItemReplacement_ReplacementItem ON dbo.PrescriptionItemReplacement (ReplacementPrescriptionItemId);
END
GO
