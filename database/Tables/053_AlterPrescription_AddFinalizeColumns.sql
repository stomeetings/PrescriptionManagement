-- Step 18.8 (Finalize Prescription): adds FinalizedDate/FinalizedBy to Prescription.
-- Finalize itself is a status transition (DRAFT -> PENDING, see usp_Prescription_
-- Finalize's own comment for why "Finalized" maps onto the already-seeded PENDING status
-- rather than a new status row), but "when/who finalized this" is a fact worth its own
-- columns rather than only living in PrescriptionAudit - the same reasoning
-- PatientMedication already applies to StoppedDate/StoppedBy. Guarded with IF NOT EXISTS
-- so this script can be re-run safely.

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Prescription') AND name = 'FinalizedDate')
BEGIN
    ALTER TABLE dbo.Prescription ADD FinalizedDate DATETIME2 NULL;
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Prescription') AND name = 'FinalizedBy')
BEGIN
    ALTER TABLE dbo.Prescription ADD FinalizedBy NVARCHAR(100) NULL;
END
GO
