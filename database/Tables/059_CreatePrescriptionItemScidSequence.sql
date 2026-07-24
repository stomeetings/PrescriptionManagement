-- Prescription Item Amendment & Replacement: SCID has no definition anywhere in this
-- project's docs (confirmed with the user before implementing) - it reads like an NZePS
-- (electronic prescribing) artifact, which this project explicitly excludes. Treated
-- here as an opaque internal identifier only: this feature's own way of tagging a
-- PrescriptionItem's place in a replacement chain, formatted 'SCID-000001' purely so the
-- UI can show the exact literal style this task's own mockups use ("SCID-987654321") -
-- it carries no NZePS meaning, format guarantee, or external interoperability. Mirrors
-- Prescription_PrescriptionNumberSequence's identical pattern (037).

IF NOT EXISTS (SELECT 1 FROM sys.sequences WHERE name = 'PrescriptionItem_ScidSequence' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
    CREATE SEQUENCE dbo.PrescriptionItem_ScidSequence
        AS INT
        START WITH 1
        INCREMENT BY 1
        NO CYCLE;
END
GO
