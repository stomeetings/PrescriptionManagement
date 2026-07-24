-- Corrective migration: 061_AlterPrescriptionItem_AddItemStatusAndScid.sql's own
-- "ALTER COLUMN Scid ... NOT NULL" step silently never took effect in at least one
-- deployed database - blocked by UQ_PrescriptionItem_Scid already existing (SQL Server
-- refuses to ALTER COLUMN nullability while a dependent unique constraint references the
-- column). Discovered via a Finalize failure ("Cannot insert the value NULL into column
-- 'Scid'... PatientMedicationPrescription"), since PrescriptionItem.Scid was left
-- nullable with no working default, so Save Draft silently produced NULL Scids.
-- Backfills any existing NULLs, drops the unique constraint just long enough to widen
-- the column, then restores both the constraint and the missing default. Guarded/safe
-- to re-run.

-- 1. Backfill any existing NULL Scid values (same sequence future rows use).
UPDATE dbo.PrescriptionItem
SET Scid = 'SCID-' + RIGHT('000000' + CAST(NEXT VALUE FOR dbo.PrescriptionItem_ScidSequence AS NVARCHAR(10)), 6)
WHERE Scid IS NULL;
GO

-- 2. Drop the unique constraint if present, so the column can be widened.
IF EXISTS (SELECT 1 FROM sys.key_constraints WHERE name = 'UQ_PrescriptionItem_Scid' AND parent_object_id = OBJECT_ID('dbo.PrescriptionItem'))
BEGIN
    ALTER TABLE dbo.PrescriptionItem DROP CONSTRAINT UQ_PrescriptionItem_Scid;
END
GO

-- 3. Now safe to widen the column to NOT NULL.
IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.PrescriptionItem') AND name = 'Scid' AND is_nullable = 1)
BEGIN
    ALTER TABLE dbo.PrescriptionItem ALTER COLUMN Scid NVARCHAR(50) NOT NULL;
END
GO

-- 4. Restore the unique constraint.
IF NOT EXISTS (SELECT 1 FROM sys.key_constraints WHERE name = 'UQ_PrescriptionItem_Scid' AND parent_object_id = OBJECT_ID('dbo.PrescriptionItem'))
BEGIN
    ALTER TABLE dbo.PrescriptionItem ADD CONSTRAINT UQ_PrescriptionItem_Scid UNIQUE (Scid);
END
GO

-- 5. Restore the missing default constraint so future inserts never leave Scid NULL again.
IF NOT EXISTS (SELECT 1 FROM sys.default_constraints WHERE name = 'DF_PrescriptionItem_Scid')
BEGIN
    ALTER TABLE dbo.PrescriptionItem
        ADD CONSTRAINT DF_PrescriptionItem_Scid DEFAULT ('SCID-' + RIGHT('000000' + CAST(NEXT VALUE FOR dbo.PrescriptionItem_ScidSequence AS NVARCHAR(10)), 6)) FOR Scid;
END
GO
