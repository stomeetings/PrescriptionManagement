-- Prescription Item Amendment & Replacement: append-only per-item lifecycle log,
-- mirroring PatientMedicationHistory/PrescriptionAudit's identical append-only
-- precedent, scoped to PrescriptionItem instead. Only two Action values exist today:
-- SUPERSEDED (written against the OLD item) and REPLACEMENT_CREATED (written against
-- the NEW item, Notes carrying its freshly generated Scid - this is what the frontend
-- Timeline labels "New SCID Generated"). "Prescription Created"/"Medication Updated"
-- from this feature's own 5-step timeline list are already covered by the existing
-- PrescriptionAudit (CREATED) and PrescriptionItemAmendment (the diff record itself,
-- unioned into the timeline as an 'AMENDED' event) - not duplicated here.
-- Guarded with IF NOT EXISTS so this script can be re-run safely.

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'PrescriptionItemHistory' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
    CREATE TABLE dbo.PrescriptionItemHistory
    (
        PrescriptionItemHistoryId INT IDENTITY(1,1) NOT NULL,
        PrescriptionItemId         INT              NOT NULL,
        Action                      NVARCHAR(50)    NOT NULL,
        Notes                        NVARCHAR(500)  NULL,
        ChangedBy                     NVARCHAR(100) NOT NULL,
        ChangedDate                    DATETIME2    NOT NULL CONSTRAINT DF_PrescriptionItemHistory_ChangedDate DEFAULT (SYSUTCDATETIME()),

        CONSTRAINT PK_PrescriptionItemHistory PRIMARY KEY CLUSTERED (PrescriptionItemHistoryId),
        CONSTRAINT FK_PrescriptionItemHistory_PrescriptionItem FOREIGN KEY (PrescriptionItemId) REFERENCES dbo.PrescriptionItem (PrescriptionItemId),
        CONSTRAINT CK_PrescriptionItemHistory_Action CHECK (Action IN ('SUPERSEDED', 'REPLACEMENT_CREATED'))
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_PrescriptionItemHistory_PrescriptionItem' AND object_id = OBJECT_ID('dbo.PrescriptionItemHistory'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_PrescriptionItemHistory_PrescriptionItem ON dbo.PrescriptionItemHistory (PrescriptionItemId);
END
GO
