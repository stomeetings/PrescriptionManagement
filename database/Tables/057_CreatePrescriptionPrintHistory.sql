-- Reprint Prescription: a dedicated table, not an extension of PrescriptionAudit -
-- unlike Step 18.7/18.8's Version/Finalize audit needs (which mapped almost 1:1 onto
-- PrescriptionAudit's existing PreviousValues/NewValues diff shape), a print event's own
-- fields (Reason, CopyCount, VersionPrinted) don't fit that shape at all, and this
-- feature's own task explicitly names a new table. PrintType only ever inserts
-- 'REPRINTED' today - the original, manual browser Print action (Step 18.3) never calls
-- the backend at all, so no 'PRINTED' row is ever written; the CHECK constraint is
-- scoped to what's actually built now (CLAUDE.md: "don't design for hypothetical future
-- requirements"), extendable later exactly like every other CK_*_Action constraint in
-- this module if a future step adds real Print logging. Reason is NOT NULL because it's
-- only ever populated by the Reprint flow, where it's a required field.
-- Guarded with IF NOT EXISTS so this script can be re-run safely.

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'PrescriptionPrintHistory' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
    CREATE TABLE dbo.PrescriptionPrintHistory
    (
        PrescriptionPrintHistoryId INT IDENTITY(1,1) NOT NULL,
        PrescriptionId              INT              NOT NULL,
        PrintType                    NVARCHAR(20)    NOT NULL,
        Reason                        NVARCHAR(500)  NOT NULL,
        CopyCount                     INT             NOT NULL,
        VersionPrinted                 INT            NOT NULL,
        PrintedBy                       NVARCHAR(100) NOT NULL,
        PrintedDate                      DATETIME2    NOT NULL CONSTRAINT DF_PrescriptionPrintHistory_PrintedDate DEFAULT (SYSUTCDATETIME()),

        CONSTRAINT PK_PrescriptionPrintHistory PRIMARY KEY CLUSTERED (PrescriptionPrintHistoryId),
        CONSTRAINT FK_PrescriptionPrintHistory_Prescription FOREIGN KEY (PrescriptionId) REFERENCES dbo.Prescription (PrescriptionId),
        CONSTRAINT CK_PrescriptionPrintHistory_PrintType CHECK (PrintType IN ('REPRINTED')),
        CONSTRAINT CK_PrescriptionPrintHistory_CopyCount CHECK (CopyCount BETWEEN 1 AND 5)
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_PrescriptionPrintHistory_Prescription' AND object_id = OBJECT_ID('dbo.PrescriptionPrintHistory'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_PrescriptionPrintHistory_Prescription ON dbo.PrescriptionPrintHistory (PrescriptionId);
END
GO
