-- Cleanup for the temporary diagnostic table used to trace the Save Draft "Cannot
-- insert the value NULL into column 'ItemStatus'" bug (2026-07-22) - root cause found
-- and fixed (usp_Prescription_CreateDraft.sql and friends now set ItemStatus explicitly;
-- 079_AlterPrescriptionItem_RestoreItemStatusDefault.sql restores the missing default
-- constraint). Run this once to remove the scratch table; safe to re-run.

IF EXISTS (SELECT 1 FROM sys.tables WHERE name = 'zzz_Debug_CreateDraftLog' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
    DROP TABLE dbo.zzz_Debug_CreateDraftLog;
END
GO
