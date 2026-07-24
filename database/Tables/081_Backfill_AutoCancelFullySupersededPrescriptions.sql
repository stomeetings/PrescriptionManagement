-- One-time backfill (2026-07-23): the "auto-cancel a Prescription once every item on it
-- is SUPERSEDED" rule was added to usp_PrescriptionItem_Amend after some amendments had
-- already run - it only evaluates at the moment of a NEW amendment, so any Prescription
-- that was fully superseded BEFORE the rule existed was left stuck at its old status
-- (e.g. PENDING) with zero live content. This finds every such prescription, system-wide,
-- and cancels it exactly the way usp_PrescriptionItem_Amend's own auto-cancel block
-- would have, had it existed at the time. Safe to re-run - matching prescriptions are
-- already CANCELLED after the first run, so a second run finds nothing left to do.

DECLARE @CancelledStatusId INT, @BackfillDate DATETIME2 = SYSUTCDATETIME(), @BackfillBy NVARCHAR(100) = 'SYSTEM_BACKFILL';
SELECT @CancelledStatusId = PrescriptionStatusId FROM dbo.PrescriptionStatus WHERE Code = 'CANCELLED' AND IsActive = 1 AND IsDeleted = 0;

IF @CancelledStatusId IS NOT NULL
BEGIN
    DECLARE @BackfilledPrescriptions TABLE (PrescriptionId INT);

    UPDATE p
    SET p.PrescriptionStatusId = @CancelledStatusId,
        p.UpdatedDate = @BackfillDate,
        p.UpdatedBy = @BackfillBy
    OUTPUT inserted.PrescriptionId INTO @BackfilledPrescriptions
    FROM dbo.Prescription AS p
    WHERE p.IsDeleted = 0
      AND p.PrescriptionStatusId NOT IN (
          SELECT PrescriptionStatusId FROM dbo.PrescriptionStatus WHERE Code IN ('DRAFT', 'CANCELLED', 'DISPENSED')
      )
      AND EXISTS (SELECT 1 FROM dbo.PrescriptionItem AS pi WHERE pi.PrescriptionId = p.PrescriptionId)
      AND NOT EXISTS (
          SELECT 1 FROM dbo.PrescriptionItem AS pi2
          WHERE pi2.PrescriptionId = p.PrescriptionId AND pi2.ItemStatus <> 'SUPERSEDED'
      );

    INSERT INTO dbo.PrescriptionCancellation (PrescriptionId, CancellationType, CancellationReason, Comments, CancelledBy, CancelledDate)
    SELECT
        bp.PrescriptionId, 'OTHER',
        'All medications on this prescription have been individually replaced.',
        'Backfilled - this prescription was already fully superseded before the auto-cancel rule existed.',
        @BackfillBy, @BackfillDate
    FROM @BackfilledPrescriptions AS bp
    WHERE NOT EXISTS (SELECT 1 FROM dbo.PrescriptionCancellation pc WHERE pc.PrescriptionId = bp.PrescriptionId);

    INSERT INTO dbo.PrescriptionAudit (PrescriptionId, Action, PreviousValues, NewValues, ChangedBy, ChangedFields)
    SELECT
        bp.PrescriptionId, 'CANCELLED', NULL,
        (SELECT @CancelledStatusId AS PrescriptionStatusId FOR JSON PATH, WITHOUT_ARRAY_WRAPPER),
        @BackfillBy, 'All items superseded (backfilled)'
    FROM @BackfilledPrescriptions AS bp;

    SELECT PrescriptionId FROM @BackfilledPrescriptions;
END
GO
