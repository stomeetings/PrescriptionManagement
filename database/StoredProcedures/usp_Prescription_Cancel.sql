-- Entire Prescription Cancellation: invalidates a whole Prescription and cascades every
-- currently ACTIVE PrescriptionItem to CANCELLED in the same transaction. Distinct from
-- Prescription Item Amendment & Replacement (which supersedes one item and spins up a
-- brand-new replacement Prescription) - this cancels the Prescription itself and
-- everything still active on it; nothing new is created except the audit/cancellation
-- record. Items already SUPERSEDED or DISPENSED are left untouched (task's own explicit
-- rule) - the cascade UPDATE only ever selects ItemStatus = 'ACTIVE' rows.
-- All validation lives here, not in the Service layer - mirrors usp_Prescription_Finalize's
-- own single-source-of-truth style (PrescriptionFinalizeService is a thin passthrough),
-- not usp_Prescription_Renew's split C#-precheck/SQL-race-guard style, since this
-- procedure's only inputs are the Prescription's own current state plus caller-supplied
-- text fields - nothing here needs a richer read model fetched ahead of time.
-- Eligible only when the current status is neither DRAFT (not yet finalized - a Draft is
-- simply discarded, not "cancelled"), CANCELLED (already cancelled), nor DISPENSED (fully
-- dispensed) - every other status (PENDING/PROCESSING/SENT/FAILED/EXPIRED) is cancellable.
-- No NZePS/dispensing integration exists yet in this system (this task's own "Do NOT
-- implement" list) - this eligibility rule is written for the full seeded status
-- lifecycle even though PROCESSING/SENT/DISPENSED can't actually occur yet (no Worker),
-- matching how PrescriptionStatus's own seed data already anticipates the Worker before
-- it exists.
-- New error range: 50062 PRESCRIPTION_NOT_ELIGIBLE_FOR_CANCELLATION (still Draft), 50063
-- PRESCRIPTION_ALREADY_CANCELLED, 50064 PRESCRIPTION_FULLY_DISPENSED, 50065
-- PRESCRIPTION_CANCELLATION_CONFLICT (race-guard on the status-guarded UPDATE - can only
-- fire if another request changed the status between the pre-check and the UPDATE).
-- 50047/50048 reused from Finalize/Renew for status-not-seeded/not-found.
CREATE OR ALTER PROCEDURE dbo.usp_Prescription_Cancel
    @PrescriptionId     INT,
    @CancellationType   NVARCHAR(30),
    @CancellationReason NVARCHAR(500),
    @Comments           NVARCHAR(1000),
    @CancelledBy        NVARCHAR(100)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRY
        DECLARE @DraftStatusId INT, @CancelledStatusId INT, @DispensedStatusId INT;

        SELECT @DraftStatusId = PrescriptionStatusId FROM dbo.PrescriptionStatus WHERE Code = 'DRAFT' AND IsActive = 1 AND IsDeleted = 0;
        SELECT @CancelledStatusId = PrescriptionStatusId FROM dbo.PrescriptionStatus WHERE Code = 'CANCELLED' AND IsActive = 1 AND IsDeleted = 0;
        SELECT @DispensedStatusId = PrescriptionStatusId FROM dbo.PrescriptionStatus WHERE Code = 'DISPENSED' AND IsActive = 1 AND IsDeleted = 0;

        IF @DraftStatusId IS NULL OR @CancelledStatusId IS NULL OR @DispensedStatusId IS NULL
        BEGIN
            THROW 50047, 'PRESCRIPTION_STATUS_NOT_SEEDED', 1;
        END

        DECLARE @CurrentStatusId INT;

        SELECT @CurrentStatusId = PrescriptionStatusId
        FROM dbo.Prescription
        WHERE PrescriptionId = @PrescriptionId AND IsDeleted = 0;

        IF @CurrentStatusId IS NULL
        BEGIN
            THROW 50048, 'PRESCRIPTION_NOT_FOUND', 1;
        END

        IF @CurrentStatusId = @DraftStatusId
        BEGIN
            THROW 50062, 'PRESCRIPTION_NOT_ELIGIBLE_FOR_CANCELLATION', 1;
        END

        IF @CurrentStatusId = @CancelledStatusId
        BEGIN
            THROW 50063, 'PRESCRIPTION_ALREADY_CANCELLED', 1;
        END

        IF @CurrentStatusId = @DispensedStatusId
        BEGIN
            THROW 50064, 'PRESCRIPTION_FULLY_DISPENSED', 1;
        END

        DECLARE @CancelledDate DATETIME2 = SYSUTCDATETIME();

        BEGIN TRANSACTION;

        -- Status-guarded UPDATE, same concurrency idiom as usp_Prescription_Finalize -
        -- @@ROWCOUNT = 0 here can only mean someone else changed this Prescription's
        -- status (cancelled or it reached Dispensed) between the pre-check above and this
        -- UPDATE.
        UPDATE dbo.Prescription
        SET PrescriptionStatusId = @CancelledStatusId,
            UpdatedDate = @CancelledDate,
            UpdatedBy = @CancelledBy
        WHERE PrescriptionId = @PrescriptionId
          AND IsDeleted = 0
          AND PrescriptionStatusId NOT IN (@DraftStatusId, @CancelledStatusId, @DispensedStatusId);

        IF @@ROWCOUNT = 0
        BEGIN
            THROW 50065, 'PRESCRIPTION_CANCELLATION_CONFLICT', 1;
        END

        -- Cascade: every currently ACTIVE item becomes CANCELLED. Items already
        -- SUPERSEDED or DISPENSED are untouched - this UPDATE's WHERE clause simply never
        -- selects those rows (task's own explicit "Items already Superseded/Dispensed
        -- remain Superseded/Dispensed" rule).
        UPDATE dbo.PrescriptionItem
        SET ItemStatus = 'CANCELLED'
        WHERE PrescriptionId = @PrescriptionId AND ItemStatus = 'ACTIVE';

        DECLARE @CancelledItemCount INT = @@ROWCOUNT;

        INSERT INTO dbo.PrescriptionCancellation
            (PrescriptionId, CancellationType, CancellationReason, Comments, CancelledBy, CancelledDate)
        VALUES
            (@PrescriptionId, @CancellationType, @CancellationReason, @Comments, @CancelledBy, @CancelledDate);

        DECLARE @NewValuesJson NVARCHAR(MAX);
        SELECT @NewValuesJson = (
            SELECT @CancellationType AS CancellationType, @CancellationReason AS CancellationReason,
                   @Comments AS Comments, @CancelledItemCount AS CancelledItemCount
            FOR JSON PATH, WITHOUT_ARRAY_WRAPPER
        );

        -- ChangedFields carries the Reason, reusing the Timeline's existing "show
        -- ChangedFields as a subtitle" rendering (same pattern REPRINTED's Reason
        -- already uses) - no new frontend field needed.
        INSERT INTO dbo.PrescriptionAudit (PrescriptionId, Action, PreviousValues, NewValues, ChangedBy, ChangedFields)
        VALUES (@PrescriptionId, 'CANCELLED', NULL, @NewValuesJson, @CancelledBy, @CancellationReason);

        COMMIT TRANSACTION;

        SELECT
            p.PrescriptionId,
            p.PrescriptionNumber,
            ps.Code AS StatusCode,
            ps.DisplayText AS StatusDisplayText,
            @CancelledDate AS CancelledDate,
            @CancelledBy AS CancelledBy,
            @CancelledItemCount AS CancelledItemCount
        FROM dbo.Prescription AS p
        INNER JOIN dbo.PrescriptionStatus AS ps ON ps.PrescriptionStatusId = p.PrescriptionStatusId
        WHERE p.PrescriptionId = @PrescriptionId;
    END TRY
    BEGIN CATCH
        IF XACT_STATE() <> 0
        BEGIN
            ROLLBACK TRANSACTION;
        END

        THROW;
    END CATCH
END
GO
