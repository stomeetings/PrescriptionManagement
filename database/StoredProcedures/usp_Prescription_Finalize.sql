-- Step 18.8: locks a Draft Prescription as an official clinical document. No new
-- "Finalized" status row exists (or fits CLAUDE.md's fixed Prescription status lifecycle
-- Draft -> Pending -> Processing -> Sent -> Dispensed / Cancelled / Failed / Expired) -
-- "Finalize" is the action that performs exactly that first transition, DRAFT -> PENDING.
-- This is a deliberate, evidence-backed reconciliation (confirmed with the user): PENDING
-- is already documented (CLAUDE.md's Worker section) as "awaiting the Worker's automated
-- pickup" - a semantic match for "locked, official, awaiting a future Send to NZePS".
-- Editing is locked "for free" as a side effect: usp_Prescription_UpdateDraft and
-- usp_Prescription_RestoreVersion already reject anything whose PrescriptionStatusId
-- isn't DRAFT (PRESCRIPTION_NOT_EDITABLE, 50049) - no separate "IsLocked" flag/check is
-- needed anywhere.
-- Custom error range extended: 50052 PRESCRIPTION_ALREADY_FINALIZED, 50053
-- PRESCRIPTION_MEDICINE_INACTIVE, 50054 PRESCRIPTION_DUPLICATE_MEDICATION, 50055
-- PRESCRIPTION_MISSING_DIRECTIONS, 50056 PRESCRIPTION_INVALID_ISSUE_DATE, 50057
-- PRESCRIPTION_INVALID_EXPIRY_DATE (50041/50042/50044/50048 reused from Create/Update for
-- the same conditions: invalid patient/provider, no medications, prescription not found).
CREATE OR ALTER PROCEDURE dbo.usp_Prescription_Finalize
    @PrescriptionId INT,
    @FinalizedBy NVARCHAR(100)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRY
        DECLARE @DraftStatusId INT, @PendingStatusId INT;

        SELECT @DraftStatusId = PrescriptionStatusId FROM dbo.PrescriptionStatus WHERE Code = 'DRAFT' AND IsActive = 1 AND IsDeleted = 0;
        SELECT @PendingStatusId = PrescriptionStatusId FROM dbo.PrescriptionStatus WHERE Code = 'PENDING' AND IsActive = 1 AND IsDeleted = 0;

        IF @DraftStatusId IS NULL OR @PendingStatusId IS NULL
        BEGIN
            THROW 50047, 'DRAFT_STATUS_NOT_SEEDED', 1;
        END

        DECLARE @PatientId INT, @ProviderUserAccountId INT, @CurrentStatusId INT, @IssueDate DATE, @ExpiryDate DATE;

        SELECT
            @PatientId = PatientId,
            @ProviderUserAccountId = ProviderUserAccountId,
            @CurrentStatusId = PrescriptionStatusId,
            @IssueDate = IssueDate,
            @ExpiryDate = ExpiryDate
        FROM dbo.Prescription
        WHERE PrescriptionId = @PrescriptionId AND IsDeleted = 0;

        IF @PatientId IS NULL
        BEGIN
            THROW 50048, 'PRESCRIPTION_NOT_FOUND', 1;
        END

        -- "Draft exists" / "Draft not already finalized" (Draft exists AND is still at
        -- Draft status - both conditions collapse into the same check/error).
        IF @CurrentStatusId <> @DraftStatusId
        BEGIN
            THROW 50052, 'PRESCRIPTION_ALREADY_FINALIZED', 1;
        END

        IF NOT EXISTS (SELECT 1 FROM dbo.Patient WHERE PatientId = @PatientId AND IsActive = 1 AND IsDeleted = 0)
        BEGIN
            THROW 50041, 'INVALID_PATIENT', 1;
        END

        IF NOT EXISTS (SELECT 1 FROM dbo.UserAccount WHERE UserAccountId = @ProviderUserAccountId AND IsActive = 1 AND IsDeleted = 0)
        BEGIN
            THROW 50042, 'INVALID_PROVIDER', 1;
        END

        IF NOT EXISTS (SELECT 1 FROM dbo.PrescriptionItem WHERE PrescriptionId = @PrescriptionId)
        BEGIN
            THROW 50044, 'NO_MEDICATIONS', 1;
        END

        IF EXISTS (
            SELECT 1
            FROM dbo.PrescriptionItem AS pi
            INNER JOIN dbo.Medicine AS m ON m.MedicineId = pi.MedicineId
            WHERE pi.PrescriptionId = @PrescriptionId AND m.IsActive = 0
        )
        BEGIN
            THROW 50053, 'PRESCRIPTION_MEDICINE_INACTIVE', 1;
        END

        IF EXISTS (
            SELECT MedicineId
            FROM dbo.PrescriptionItem
            WHERE PrescriptionId = @PrescriptionId
            GROUP BY MedicineId
            HAVING COUNT(*) > 1
        )
        BEGIN
            THROW 50054, 'PRESCRIPTION_DUPLICATE_MEDICATION', 1;
        END

        IF EXISTS (
            SELECT 1 FROM dbo.PrescriptionItem
            WHERE PrescriptionId = @PrescriptionId AND LTRIM(RTRIM(ISNULL(Instructions, N''))) = N''
        )
        BEGIN
            THROW 50055, 'PRESCRIPTION_MISSING_DIRECTIONS', 1;
        END

        IF @IssueDate > CAST(SYSUTCDATETIME() AS DATE)
        BEGIN
            THROW 50056, 'PRESCRIPTION_INVALID_ISSUE_DATE', 1;
        END

        -- ExpiryDate is nullable (never set by Create/Update in this phase) - only
        -- validated when present, not required.
        IF @ExpiryDate IS NOT NULL AND @ExpiryDate < @IssueDate
        BEGIN
            THROW 50057, 'PRESCRIPTION_INVALID_EXPIRY_DATE', 1;
        END

        DECLARE @PreviousValuesJson NVARCHAR(MAX);
        SELECT @PreviousValuesJson = (
            SELECT PrescriptionId, PrescriptionStatusId
            FROM dbo.Prescription
            WHERE PrescriptionId = @PrescriptionId
            FOR JSON PATH, WITHOUT_ARRAY_WRAPPER
        );

        DECLARE @FinalizedDate DATETIME2 = SYSUTCDATETIME();

        BEGIN TRANSACTION;

        -- Status-guarded UPDATE, same concurrency pattern as usp_Prescription_
        -- UpdateDraft's RowVersion check: @@ROWCOUNT = 0 here can only mean someone else
        -- finalized this same prescription between the pre-check above and this UPDATE -
        -- reported as the same PRESCRIPTION_ALREADY_FINALIZED case, not a separate
        -- concurrency error, since Finalize has no content fields for two concurrent
        -- calls to actually conflict over.
        UPDATE dbo.Prescription
        SET PrescriptionStatusId = @PendingStatusId,
            FinalizedDate = @FinalizedDate,
            FinalizedBy = @FinalizedBy,
            UpdatedDate = @FinalizedDate,
            UpdatedBy = @FinalizedBy
        WHERE PrescriptionId = @PrescriptionId
          AND IsDeleted = 0
          AND PrescriptionStatusId = @DraftStatusId;

        IF @@ROWCOUNT = 0
        BEGIN
            THROW 50052, 'PRESCRIPTION_ALREADY_FINALIZED', 1;
        END

        DECLARE @CurrentVersionNumber INT;
        SELECT @CurrentVersionNumber = MAX(VersionNumber) FROM dbo.PrescriptionVersion WHERE PrescriptionId = @PrescriptionId;

        DECLARE @NewValuesJson NVARCHAR(MAX);
        SELECT @NewValuesJson = (
            SELECT PrescriptionId, PrescriptionStatusId, FinalizedDate, FinalizedBy
            FROM dbo.Prescription
            WHERE PrescriptionId = @PrescriptionId
            FOR JSON PATH, WITHOUT_ARRAY_WRAPPER
        );

        -- No new PrescriptionVersion snapshot is created here - Finalize changes status/
        -- lock state, not content, so the current version already reflects exactly what
        -- was finalized. VersionNumber on this audit row records which version that was.
        INSERT INTO dbo.PrescriptionAudit (PrescriptionId, Action, PreviousValues, NewValues, ChangedBy, VersionNumber, ChangedFields)
        VALUES (@PrescriptionId, 'FINALIZED', @PreviousValuesJson, @NewValuesJson, @FinalizedBy, @CurrentVersionNumber, 'PrescriptionStatusId, FinalizedDate, FinalizedBy');

        -- Patient Medication and Prescription Synchronization: link rows are created
        -- here, at Finalize, not at CreateDraft/UpdateDraft - a Draft can be edited
        -- several times before anyone reviews it (usp_Prescription_UpdateDraft's own
        -- DELETE+INSERT item-replacement strategy would otherwise orphan/conflict with
        -- rows referencing since-deleted draft-stage PrescriptionItem ids). RelationshipType
        -- is ORIGINAL unless this Prescription was itself created by
        -- usp_Prescription_Renew (a PrescriptionRenewal row exists with this
        -- PrescriptionId as the Renewed side) - REPLACEMENT is never assigned here,
        -- since usp_PrescriptionItem_Amend's replacement Prescriptions reach PENDING/
        -- Active directly and never pass through this procedure at all.
        DECLARE @LinkRelationshipType NVARCHAR(20) = CASE
            WHEN EXISTS (SELECT 1 FROM dbo.PrescriptionRenewal WHERE RenewedPrescriptionId = @PrescriptionId) THEN 'RENEWAL'
            ELSE 'ORIGINAL'
        END;

        INSERT INTO dbo.PatientMedicationPrescription (PatientMedicationId, PrescriptionId, PrescriptionItemId, Scid, RelationshipType, CreatedBy)
        SELECT PatientMedicationId, PrescriptionId, PrescriptionItemId, Scid, @LinkRelationshipType, @FinalizedBy
        FROM dbo.PrescriptionItem
        WHERE PrescriptionId = @PrescriptionId AND PatientMedicationId IS NOT NULL;

        COMMIT TRANSACTION;

        SELECT
            p.PrescriptionId,
            p.PrescriptionNumber,
            ps.Code AS StatusCode,
            ps.DisplayText AS StatusDisplayText,
            p.FinalizedDate,
            p.FinalizedBy
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
