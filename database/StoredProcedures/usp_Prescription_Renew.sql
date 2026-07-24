-- Prescription Renewal - creates a new DRAFT Prescription from selected items on an
-- already-finalized one. Unlike usp_PrescriptionItem_Amend (which creates its
-- replacement directly at PENDING/"Active" status, auto-finalized), a renewal explicitly
-- goes through the normal Draft -> Doctor reviews -> Preview -> Print -> Finalize
-- lifecycle (this feature's own workflow) - so the new Prescription starts at DRAFT,
-- exactly like usp_Prescription_CreateDraft's own result, and PatientMedicationPrescription
-- link rows are NOT written here (they're written at Finalize time, per the established
-- synchronization rule - see usp_Prescription_Finalize's own updated comment).
-- Business-rule validation (original finalized/not cancelled/not expired, patient/
-- provider/medicine active) already happened in PrescriptionRenewalService before this
-- is called, using data it already fetched via IPrescriptionRepository.GetDetailsByIdAsync
-- - this procedure only re-validates the two conditions that can genuinely race or that
-- SQL is uniquely positioned to check cheaply: the original's status hasn't changed
-- since that check, and every selected item actually belongs to @OriginalPrescriptionId
-- (prevents cross-prescription selection / orphan relationships).
-- @ItemsJson carries the FINAL (already-resolved: override if the clinician changed it,
-- else copied from the original) Quantity/Duration/Instructions per selected item -
-- Medicine/Strength/Dose/DoseUnit/Frequency/Route are never in this JSON at all, since
-- this feature's own rule ("Do not allow modification of: Medicine, Strength") means
-- they're always looked up fresh from the original PrescriptionItem row here, not
-- trusted from the caller.
-- New error range: 50060 PRESCRIPTION_ITEM_NOT_IN_PRESCRIPTION, 50061
-- PRESCRIPTION_NOT_ELIGIBLE_FOR_RENEWAL.
CREATE OR ALTER PROCEDURE dbo.usp_Prescription_Renew
    @OriginalPrescriptionId INT,
    @ItemsJson NVARCHAR(MAX),
    @NewXhtml NVARCHAR(MAX),
    @RenewedBy NVARCHAR(100)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRY
        DECLARE @PatientId INT, @ProviderUserAccountId INT, @ClinicalNotes NVARCHAR(MAX), @DraftStatusId INT, @CurrentStatusId INT;

        SELECT @DraftStatusId = PrescriptionStatusId FROM dbo.PrescriptionStatus WHERE Code = 'DRAFT' AND IsActive = 1 AND IsDeleted = 0;

        IF @DraftStatusId IS NULL
        BEGIN
            THROW 50047, 'DRAFT_STATUS_NOT_SEEDED', 1;
        END

        SELECT
            @PatientId = PatientId,
            @ProviderUserAccountId = ProviderUserAccountId,
            @ClinicalNotes = ClinicalNotes,
            @CurrentStatusId = PrescriptionStatusId
        FROM dbo.Prescription
        WHERE PrescriptionId = @OriginalPrescriptionId AND IsDeleted = 0;

        IF @PatientId IS NULL
        BEGIN
            THROW 50048, 'PRESCRIPTION_NOT_FOUND', 1;
        END

        IF @CurrentStatusId = @DraftStatusId
           OR EXISTS (SELECT 1 FROM dbo.PrescriptionStatus WHERE PrescriptionStatusId = @CurrentStatusId AND Code = 'CANCELLED')
        BEGIN
            THROW 50061, 'PRESCRIPTION_NOT_ELIGIBLE_FOR_RENEWAL', 1;
        END

        IF NOT EXISTS (SELECT 1 FROM OPENJSON(@ItemsJson))
        BEGIN
            THROW 50044, 'NO_MEDICATIONS', 1;
        END

        -- Every selected item must belong to the original prescription - prevents a
        -- caller from smuggling in an unrelated PrescriptionItemId.
        IF EXISTS (
            SELECT 1
            FROM OPENJSON(@ItemsJson) WITH (PrescriptionItemId INT '$.prescriptionItemId') AS Selected
            LEFT JOIN dbo.PrescriptionItem AS pi
                ON pi.PrescriptionItemId = Selected.PrescriptionItemId AND pi.PrescriptionId = @OriginalPrescriptionId
            WHERE pi.PrescriptionItemId IS NULL
        )
        BEGIN
            THROW 50060, 'PRESCRIPTION_ITEM_NOT_IN_PRESCRIPTION', 1;
        END

        DECLARE @NewPrescriptionNumber NVARCHAR(50) =
            'RX-' + RIGHT('000000' + CAST(NEXT VALUE FOR dbo.Prescription_PrescriptionNumberSequence AS NVARCHAR(10)), 6);

        DECLARE @IssueDate DATE = CAST(SYSUTCDATETIME() AS DATE);

        -- ExpiryDate has no established business rule anywhere else in this project
        -- (Prescription.ExpiryDate has stayed NULL through every prior phase) - this
        -- feature is the first to require a real value, so it's computed from data that
        -- already exists: IssueDate plus the longest selected item's own Duration,
        -- converted to days (WEEKS x7, MONTHS x30 - approximate, no calendar-month
        -- arithmetic precedent exists in this schema either).
        DECLARE @MaxDurationDays INT;
        SELECT @MaxDurationDays = MAX(
            CASE dur.Code
                WHEN 'WEEKS' THEN Selected.Duration * 7
                WHEN 'MONTHS' THEN Selected.Duration * 30
                ELSE Selected.Duration
            END
        )
        FROM OPENJSON(@ItemsJson) WITH (
            PrescriptionItemId INT '$.prescriptionItemId',
            Duration INT '$.duration'
        ) AS Selected
        INNER JOIN dbo.PrescriptionItem AS pi ON pi.PrescriptionItemId = Selected.PrescriptionItemId
        INNER JOIN dbo.DurationUnit AS dur ON dur.DurationUnitId = pi.DurationUnitId;

        DECLARE @ExpiryDate DATE = DATEADD(DAY, ISNULL(@MaxDurationDays, 0), @IssueDate);

        BEGIN TRANSACTION;

        DECLARE @NewPrescriptionId INT;

        INSERT INTO dbo.Prescription
            (PrescriptionNumber, DraftPrescriptionId, PatientId, ProviderUserAccountId, PrescriptionStatusId,
             ClinicalNotes, Xhtml, IssueDate, ExpiryDate, CreatedBy)
        VALUES
            (@NewPrescriptionNumber, NEWID(), @PatientId, @ProviderUserAccountId, @DraftStatusId,
             @ClinicalNotes, @NewXhtml, @IssueDate, @ExpiryDate, @RenewedBy);

        SET @NewPrescriptionId = SCOPE_IDENTITY();

        -- Medicine/Strength/Dose/DoseUnit/Frequency/Route always copied from the
        -- original item (pi.*), never taken from @ItemsJson - "Do not allow
        -- modification of: Medicine, Strength" (and, by the same reasoning, the other
        -- clinically-defining fields this feature doesn't list as editable either).
        -- Quantity/Duration/Instructions come from @ItemsJson - already-resolved final
        -- values (override or original, decided in the Service layer).
        INSERT INTO dbo.PrescriptionItem
            (PrescriptionId, PatientMedicationId, MedicineId, MedicineNameSnapshot, GenericNameSnapshot,
             StrengthSnapshot, DosageFormSnapshot, RouteSnapshot, Dose, DoseUnitId, DoseUnitSnapshot,
             FrequencyId, FrequencySnapshot, Duration, DurationUnitId, DurationUnitSnapshot, Quantity,
             Instructions, PRN, ItemStatus, CreatedBy)
        SELECT
            @NewPrescriptionId, pi.PatientMedicationId, pi.MedicineId, pi.MedicineNameSnapshot, pi.GenericNameSnapshot,
            pi.StrengthSnapshot, pi.DosageFormSnapshot, pi.RouteSnapshot, pi.Dose, pi.DoseUnitId, pi.DoseUnitSnapshot,
            pi.FrequencyId, pi.FrequencySnapshot, Selected.Duration, pi.DurationUnitId, pi.DurationUnitSnapshot, Selected.Quantity,
            Selected.Instructions, pi.PRN, 'ACTIVE', @RenewedBy
        FROM OPENJSON(@ItemsJson) WITH (
            PrescriptionItemId INT             '$.prescriptionItemId',
            Quantity           DECIMAL(10,2)   '$.quantity',
            Duration            INT            '$.duration',
            Instructions         NVARCHAR(500) '$.instructions'
        ) AS Selected
        INNER JOIN dbo.PrescriptionItem AS pi ON pi.PrescriptionItemId = Selected.PrescriptionItemId;

        INSERT INTO dbo.PrescriptionRenewal (OriginalPrescriptionId, RenewedPrescriptionId, RenewedBy)
        VALUES (@OriginalPrescriptionId, @NewPrescriptionId, @RenewedBy);

        DECLARE @NewValuesJson NVARCHAR(MAX);
        SELECT @NewValuesJson = (
            SELECT @NewPrescriptionId AS PrescriptionId, @NewPrescriptionNumber AS PrescriptionNumber, @OriginalPrescriptionId AS RenewedFromPrescriptionId
            FOR JSON PATH, WITHOUT_ARRAY_WRAPPER
        );

        INSERT INTO dbo.PrescriptionAudit (PrescriptionId, Action, PreviousValues, NewValues, ChangedBy)
        VALUES (@NewPrescriptionId, 'CREATED_AS_RENEWAL', NULL, @NewValuesJson, @RenewedBy);

        COMMIT TRANSACTION;

        SELECT @NewPrescriptionId AS NewPrescriptionId, @NewPrescriptionNumber AS NewPrescriptionNumber;
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
