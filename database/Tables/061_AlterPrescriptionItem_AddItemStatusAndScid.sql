-- Prescription Item Amendment & Replacement: adds a per-item status lifecycle to
-- PrescriptionItem - a deliberate reversal of that table's own original "immutable
-- snapshot, no status column" design (041/043's comments, reiterated in the Prescription
-- Details work). This feature is the first one that genuinely needs an item-level
-- lifecycle (Active -> Superseded), so the reversal is real, not accidental drift.
-- ItemStatus/Scid are both added with DEFAULT constraints rather than requiring every
-- INSERT site to supply them explicitly - usp_Prescription_CreateDraft's and
-- usp_Prescription_UpdateDraft's existing item-insert statements need zero changes; new
-- rows automatically get ItemStatus='ACTIVE' and a freshly sequenced Scid.
-- Guarded so this script is safe to re-run.

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.PrescriptionItem') AND name = 'ItemStatus')
BEGIN
    ALTER TABLE dbo.PrescriptionItem
        ADD ItemStatus NVARCHAR(20) NOT NULL CONSTRAINT DF_PrescriptionItem_ItemStatus DEFAULT ('ACTIVE');
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_PrescriptionItem_ItemStatus' AND parent_object_id = OBJECT_ID('dbo.PrescriptionItem'))
BEGIN
    ALTER TABLE dbo.PrescriptionItem
        ADD CONSTRAINT CK_PrescriptionItem_ItemStatus CHECK (ItemStatus IN ('ACTIVE', 'SUPERSEDED', 'CANCELLED', 'DISPENSED', 'EXPIRED'));
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.PrescriptionItem') AND name = 'Scid')
BEGIN
    ALTER TABLE dbo.PrescriptionItem
        ADD Scid NVARCHAR(50) NULL;
END
GO

-- Backfilled via the same sequence future rows will use (not a one-off ROW_NUMBER
-- scheme), so there is no possibility of a backfilled value later colliding with a
-- freshly generated one.
UPDATE dbo.PrescriptionItem
SET Scid = 'SCID-' + RIGHT('000000' + CAST(NEXT VALUE FOR dbo.PrescriptionItem_ScidSequence AS NVARCHAR(10)), 6)
WHERE Scid IS NULL;
GO

IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.PrescriptionItem') AND name = 'Scid' AND is_nullable = 1)
BEGIN
    ALTER TABLE dbo.PrescriptionItem ALTER COLUMN Scid NVARCHAR(50) NOT NULL;
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.key_constraints WHERE name = 'UQ_PrescriptionItem_Scid' AND parent_object_id = OBJECT_ID('dbo.PrescriptionItem'))
BEGIN
    ALTER TABLE dbo.PrescriptionItem ADD CONSTRAINT UQ_PrescriptionItem_Scid UNIQUE (Scid);
END
GO

-- Now that every row has a real Scid, new rows should get one automatically too -
-- matches Scid's own "just works everywhere, no SP changes needed" design goal above.
IF NOT EXISTS (SELECT 1 FROM sys.default_constraints WHERE name = 'DF_PrescriptionItem_Scid')
BEGIN
    ALTER TABLE dbo.PrescriptionItem
        ADD CONSTRAINT DF_PrescriptionItem_Scid DEFAULT ('SCID-' + RIGHT('000000' + CAST(NEXT VALUE FOR dbo.PrescriptionItem_ScidSequence AS NVARCHAR(10)), 6)) FOR Scid;
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_PrescriptionItem_ItemStatus' AND object_id = OBJECT_ID('dbo.PrescriptionItem'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_PrescriptionItem_ItemStatus ON dbo.PrescriptionItem (ItemStatus);
END
GO
