-- Restores DF_PrescriptionItem_ItemStatus, discovered missing from the deployed
-- database while diagnosing a Save Draft failure ("Cannot insert the value NULL into
-- column 'ItemStatus'") - 061_AlterPrescriptionItem_AddItemStatusAndScid.sql already
-- defines this constraint, but it evidently never took effect (or was dropped) in at
-- least one environment. Guarded so this is a safe no-op wherever 061 already applied
-- correctly.
IF NOT EXISTS (
    SELECT 1 FROM sys.default_constraints
    WHERE name = 'DF_PrescriptionItem_ItemStatus' AND parent_object_id = OBJECT_ID('dbo.PrescriptionItem')
)
BEGIN
    ALTER TABLE dbo.PrescriptionItem
        ADD CONSTRAINT DF_PrescriptionItem_ItemStatus DEFAULT ('ACTIVE') FOR ItemStatus;
END
GO
