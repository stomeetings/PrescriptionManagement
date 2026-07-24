-- Prescription Renewal: one row per renewal, serving both this feature's own
-- "Relationships" (Original Prescription Id/Renewed Prescription Id/Renewal Date/
-- Renewed By) and "Audit" (Original Prescription/Renewed Prescription/Renewed By/
-- Renewal Date) sections - the same fields, one table, matching PrescriptionItemReplacement's
-- identical precedent of serving both purposes at once rather than duplicating the same
-- four columns into two tables.
-- Guarded with IF NOT EXISTS so this script can be re-run safely.

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'PrescriptionRenewal' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
    CREATE TABLE dbo.PrescriptionRenewal
    (
        PrescriptionRenewalId INT IDENTITY(1,1) NOT NULL,
        OriginalPrescriptionId INT              NOT NULL,
        RenewedPrescriptionId   INT             NOT NULL,
        RenewalDate              DATETIME2      NOT NULL CONSTRAINT DF_PrescriptionRenewal_RenewalDate DEFAULT (SYSUTCDATETIME()),
        RenewedBy                 NVARCHAR(100) NOT NULL,

        CONSTRAINT PK_PrescriptionRenewal PRIMARY KEY CLUSTERED (PrescriptionRenewalId),
        CONSTRAINT FK_PrescriptionRenewal_OriginalPrescription FOREIGN KEY (OriginalPrescriptionId) REFERENCES dbo.Prescription (PrescriptionId),
        CONSTRAINT FK_PrescriptionRenewal_RenewedPrescription FOREIGN KEY (RenewedPrescriptionId) REFERENCES dbo.Prescription (PrescriptionId),
        CONSTRAINT UQ_PrescriptionRenewal_RenewedPrescription UNIQUE (RenewedPrescriptionId)
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_PrescriptionRenewal_OriginalPrescription' AND object_id = OBJECT_ID('dbo.PrescriptionRenewal'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_PrescriptionRenewal_OriginalPrescription ON dbo.PrescriptionRenewal (OriginalPrescriptionId);
END
GO
