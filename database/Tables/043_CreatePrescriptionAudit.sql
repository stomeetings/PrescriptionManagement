-- Prescription Management Phase 1 (database-spec.md section 3.3): append-only audit
-- trail, mirroring PatientMedicationHistory's exact pattern (035) - a dedicated,
-- per-module table, not a generic "AuditLog" (CLAUDE.md names AuditLog as a concept, but
-- no module in this project has ever actually built one - see database-spec.md section 2
-- item 3). Action is deliberately minimal (CREATED/UPDATED only) - this phase never
-- produces anything but CREATED; UPDATED is reserved for the imminent Edit Draft
-- capability, not the full future Pending/Sent/Cancelled lifecycle, per CLAUDE.md's
-- "don't design for hypothetical future requirements". Guarded with IF NOT EXISTS so
-- this script can be re-run safely.

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'PrescriptionAudit' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
    CREATE TABLE dbo.PrescriptionAudit
    (
        PrescriptionAuditId INT IDENTITY(1,1) NOT NULL,
        PrescriptionId       INT              NOT NULL,
        Action                NVARCHAR(50)    NOT NULL,
        PreviousValues        NVARCHAR(MAX)   NULL,
        NewValues              NVARCHAR(MAX)  NULL,
        ChangedBy              NVARCHAR(100)  NOT NULL,
        ChangedDate             DATETIME2     NOT NULL CONSTRAINT DF_PrescriptionAudit_ChangedDate DEFAULT (SYSUTCDATETIME()),

        CONSTRAINT PK_PrescriptionAudit PRIMARY KEY CLUSTERED (PrescriptionAuditId),
        CONSTRAINT FK_PrescriptionAudit_Prescription FOREIGN KEY (PrescriptionId) REFERENCES dbo.Prescription (PrescriptionId),
        CONSTRAINT CK_PrescriptionAudit_Action CHECK (Action IN ('CREATED', 'UPDATED')),
        CONSTRAINT CK_PrescriptionAudit_PreviousValuesJson CHECK (PreviousValues IS NULL OR ISJSON(PreviousValues) = 1),
        CONSTRAINT CK_PrescriptionAudit_NewValuesJson CHECK (NewValues IS NULL OR ISJSON(NewValues) = 1)
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_PrescriptionAudit_Prescription' AND object_id = OBJECT_ID('dbo.PrescriptionAudit'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_PrescriptionAudit_Prescription ON dbo.PrescriptionAudit (PrescriptionId);
END
GO
