-- Entire Prescription Cancellation: one row per cancelled Prescription, serving both
-- this feature's own "Database" field list (PrescriptionId/CancellationReason/
-- CancellationType/CancelledBy/CancelledDate/Comments) and its "Audit" section (Cancelled
-- By/Cancelled Date/Reason/Comments) at once - the same fields, one table, matching
-- PrescriptionRenewal's identical precedent of not duplicating the same columns into two
-- tables. UQ_PrescriptionCancellation_Prescription is UNIQUE (not just indexed) because a
-- Prescription can only ever be cancelled once - there is no un-cancel/re-cancel path,
-- CANCELLED is a terminal status in CLAUDE.md's fixed lifecycle.
-- CancellationType is a small, fixed, business-rule-defined set of 6 values (not managed
-- via Lookup Management) - a CHECK-constrained NVARCHAR column, matching
-- PrescriptionItem.ItemStatus/PrescriptionAudit.Action's identical precedent for this
-- shape of enum, not a new dedicated lookup table.
-- Guarded with IF NOT EXISTS so this script can be re-run safely.

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'PrescriptionCancellation' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
    CREATE TABLE dbo.PrescriptionCancellation
    (
        PrescriptionCancellationId INT IDENTITY(1,1) NOT NULL,
        PrescriptionId             INT               NOT NULL,
        CancellationType           NVARCHAR(30)      NOT NULL,
        CancellationReason         NVARCHAR(500)     NOT NULL,
        Comments                   NVARCHAR(1000)    NOT NULL,
        CancelledBy                NVARCHAR(100)     NOT NULL,
        CancelledDate              DATETIME2         NOT NULL CONSTRAINT DF_PrescriptionCancellation_CancelledDate DEFAULT (SYSUTCDATETIME()),

        CONSTRAINT PK_PrescriptionCancellation PRIMARY KEY CLUSTERED (PrescriptionCancellationId),
        CONSTRAINT FK_PrescriptionCancellation_Prescription FOREIGN KEY (PrescriptionId) REFERENCES dbo.Prescription (PrescriptionId),
        CONSTRAINT UQ_PrescriptionCancellation_Prescription UNIQUE (PrescriptionId),
        CONSTRAINT CK_PrescriptionCancellation_CancellationType CHECK (CancellationType IN ('CLINICAL_DECISION', 'ENTERED_IN_ERROR', 'DUPLICATE_PRESCRIPTION', 'PATIENT_REQUEST', 'PROVIDER_REQUEST', 'OTHER'))
    );
END
GO
