-- Cleanup for the temporary diagnostic table used to trace the Finalize
-- "CK_PrescriptionAudit_Action" bug (2026-07-23) - root cause found and fixed
-- (076_AlterPrescriptionAudit_AddCancelledAction.sql restores the full, correct check
-- constraint list, which already includes 'FINALIZED'). Run this once to remove the
-- scratch table; safe to re-run.

IF EXISTS (SELECT 1 FROM sys.tables WHERE name = 'zzz_Debug_FinalizeLog' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
    DROP TABLE dbo.zzz_Debug_FinalizeLog;
END
GO
