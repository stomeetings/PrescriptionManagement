-- Prescription Item Amendment & Replacement: extends CK_PrescriptionAudit_Action with
-- 'CREATED_AS_REPLACEMENT' - the replacement Prescription's own creation audit row uses
-- this instead of plain 'CREATED', so its Details page Timeline reads "Replacement
-- Prescription Created" rather than the generic "Draft Created" label a normal
-- usp_Prescription_CreateDraft-created prescription gets. CHECK constraints cannot be
-- altered in place, so this drops and re-adds it, matching 045/051/055's identical
-- pattern. Guarded so this script is safe to re-run.

IF EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_PrescriptionAudit_Action' AND parent_object_id = OBJECT_ID('dbo.PrescriptionAudit'))
BEGIN
    ALTER TABLE dbo.PrescriptionAudit DROP CONSTRAINT CK_PrescriptionAudit_Action;
END
GO

ALTER TABLE dbo.PrescriptionAudit
    ADD CONSTRAINT CK_PrescriptionAudit_Action CHECK (Action IN ('CREATED', 'UPDATED', 'PDF_GENERATED', 'RESTORED', 'FINALIZED', 'CREATED_AS_REPLACEMENT'));
GO
