-- Prescription Item Amendment & Replacement - the transactional core. All business-rule
-- validation (prescription finalized/active/not cancelled, medicine/patient/provider
-- active, clinically-significant change detected) already happened in
-- PrescriptionItemAmendmentService before this is called - this procedure re-validates
-- only the one condition that can genuinely race between that check and this write
-- (the item(s) still being ACTIVE), then performs the whole workflow atomically: create
-- ONE replacement Prescription (status PENDING/"Active", already finalized), insert its
-- single item, supersede EVERY currently-ACTIVE item for this PatientMedicationId (see
-- below for why there can be more than one), and write the Amendment/Replacement/
-- History/Audit records for each of them.
-- Set-based, multi-item redesign (2026-07-23): a single Patient Medication can end up
-- ACTIVE on more than one Prescription (e.g. selected independently into two separate
-- Generate Prescription actions before this feature ever ran) - editing that medication
-- must supersede ALL of those items and, per this feature's own "auto-cancel a
-- prescription once every item on it is superseded" rule, potentially cancel more than
-- one original Prescription - while still creating only the ONE new replacement
-- Prescription/Item this feature has always created. @PatientMedicationId alone now
-- drives discovery (no @PreviousPrescriptionItemId parameter - the caller no longer
-- picks "the" active item, since there may be several).
-- "Do NOT copy unaffected medications" - the replacement Prescription's own INSERT
-- statement only ever adds the one new PrescriptionItem row; nothing here touches or
-- copies any other item from any original prescription.
-- New error range: 50058 PRESCRIPTION_ITEM_NOT_FOUND, 50059 PRESCRIPTION_ITEM_ALREADY_
-- SUPERSEDED (50047 DRAFT_STATUS_NOT_SEEDED reused from Create/Finalize for the same
-- condition against the PENDING status this time).
CREATE OR ALTER PROCEDURE dbo.usp_PrescriptionItem_Amend
    @PatientMedicationId INT,
    @Reason NVARCHAR(500),
    @NewMedicineId INT,
    @NewMedicineNameSnapshot NVARCHAR(200),
    @NewGenericNameSnapshot NVARCHAR(200),
    @NewStrengthSnapshot NVARCHAR(50),
    @NewDosageFormSnapshot NVARCHAR(150),
    @NewRouteSnapshot NVARCHAR(150),
    @NewDose DECIMAL(10,3),
    @NewDoseUnitId INT,
    @NewDoseUnitSnapshot NVARCHAR(150),
    @NewFrequencyId INT,
    @NewFrequencySnapshot NVARCHAR(150),
    @NewDuration INT,
    @NewDurationUnitId INT,
    @NewDurationUnitSnapshot NVARCHAR(150),
    @NewQuantity DECIMAL(10,2),
    @NewInstructions NVARCHAR(500),
    @NewPRN BIT,
    @NewXhtml NVARCHAR(MAX),
    @NewIssueDate DATE,
    @AmendedBy NVARCHAR(100)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRY
        DECLARE @OldItems TABLE (
            PrescriptionItemId INT,
            PrescriptionId      INT,
            Scid                 NVARCHAR(50),
            MedicineId            INT,
            Dose                   DECIMAL(10,3),
            DoseUnitId              INT,
            FrequencyId              INT,
            Quantity                  DECIMAL(10,2),
            Duration                   INT,
            DurationUnitId               INT,
            Instructions                  NVARCHAR(500),
            PRN                             BIT
        );

        INSERT INTO @OldItems (PrescriptionItemId, PrescriptionId, Scid, MedicineId, Dose, DoseUnitId, FrequencyId, Quantity, Duration, DurationUnitId, Instructions, PRN)
        SELECT PrescriptionItemId, PrescriptionId, Scid, MedicineId, Dose, DoseUnitId, FrequencyId, Quantity, Duration, DurationUnitId, Instructions, PRN
        FROM dbo.PrescriptionItem
        WHERE PatientMedicationId = @PatientMedicationId AND ItemStatus = 'ACTIVE';

        IF NOT EXISTS (SELECT 1 FROM @OldItems)
        BEGIN
            THROW 50058, 'PRESCRIPTION_ITEM_NOT_FOUND', 1;
        END

        -- Patient/Provider/ClinicalNotes context for the ONE new replacement
        -- Prescription comes from whichever old item is most recent - if the same
        -- medication ended up ACTIVE on more than one prescription, they necessarily
        -- belong to the same Patient (PatientMedicationId is patient-scoped) but could
        -- reference different Providers/ClinicalNotes; the most recent is the most
        -- clinically relevant context to carry forward.
        DECLARE @PatientId INT, @ProviderUserAccountId INT, @ClinicalNotes NVARCHAR(MAX);
        SELECT TOP (1)
            @PatientId = p.PatientId,
            @ProviderUserAccountId = p.ProviderUserAccountId,
            @ClinicalNotes = p.ClinicalNotes
        FROM @OldItems AS oi
        INNER JOIN dbo.Prescription AS p ON p.PrescriptionId = oi.PrescriptionId
        ORDER BY oi.PrescriptionItemId DESC;

        DECLARE @NewPrescriptionNumber NVARCHAR(50) =
            'RX-' + RIGHT('000000' + CAST(NEXT VALUE FOR dbo.Prescription_PrescriptionNumberSequence AS NVARCHAR(10)), 6);

        DECLARE @PendingStatusId INT;
        SELECT @PendingStatusId = PrescriptionStatusId FROM dbo.PrescriptionStatus WHERE Code = 'PENDING' AND IsActive = 1 AND IsDeleted = 0;

        IF @PendingStatusId IS NULL
        BEGIN
            THROW 50047, 'DRAFT_STATUS_NOT_SEEDED', 1;
        END

        DECLARE @AmendedDate DATETIME2 = SYSUTCDATETIME();
        DECLARE @NewPrescriptionId INT, @NewPrescriptionItemId INT, @NewScid NVARCHAR(50);

        BEGIN TRANSACTION;

        INSERT INTO dbo.Prescription
            (PrescriptionNumber, DraftPrescriptionId, PatientId, ProviderUserAccountId, PrescriptionStatusId,
             ClinicalNotes, Xhtml, IssueDate, FinalizedDate, FinalizedBy, CreatedBy)
        VALUES
            (@NewPrescriptionNumber, NEWID(), @PatientId, @ProviderUserAccountId, @PendingStatusId,
             @ClinicalNotes, @NewXhtml, @NewIssueDate, @AmendedDate, @AmendedBy, @AmendedBy);

        SET @NewPrescriptionId = SCOPE_IDENTITY();

        -- "Contains ONLY MedA" - exactly one INSERT, one row, no copying of any other
        -- item from any original prescription.
        INSERT INTO dbo.PrescriptionItem
            (PrescriptionId, PatientMedicationId, MedicineId, MedicineNameSnapshot, GenericNameSnapshot,
             StrengthSnapshot, DosageFormSnapshot, RouteSnapshot, Dose, DoseUnitId, DoseUnitSnapshot,
             FrequencyId, FrequencySnapshot, Duration, DurationUnitId, DurationUnitSnapshot, Quantity,
             Instructions, PRN, ItemStatus, CreatedBy)
        VALUES
            (@NewPrescriptionId, @PatientMedicationId, @NewMedicineId, @NewMedicineNameSnapshot, @NewGenericNameSnapshot,
             @NewStrengthSnapshot, @NewDosageFormSnapshot, @NewRouteSnapshot, @NewDose, @NewDoseUnitId, @NewDoseUnitSnapshot,
             @NewFrequencyId, @NewFrequencySnapshot, @NewDuration, @NewDurationUnitId, @NewDurationUnitSnapshot, @NewQuantity,
             @NewInstructions, @NewPRN, 'ACTIVE', @AmendedBy);

        SET @NewPrescriptionItemId = SCOPE_IDENTITY();

        SELECT @NewScid = Scid FROM dbo.PrescriptionItem WHERE PrescriptionItemId = @NewPrescriptionItemId;

        -- Supersede EVERY active item for this PatientMedicationId at once (set-based) -
        -- all of them are stale the moment the underlying Patient Medication is edited,
        -- not just whichever one happened to be found first.
        UPDATE dbo.PrescriptionItem
        SET ItemStatus = 'SUPERSEDED'
        WHERE PrescriptionItemId IN (SELECT PrescriptionItemId FROM @OldItems) AND ItemStatus = 'ACTIVE';

        IF @@ROWCOUNT = 0
        BEGIN
            -- Someone else superseded every one of these between the pre-check above
            -- and this UPDATE - the same race usp_Prescription_Finalize's own
            -- status-guarded UPDATE already defends against.
            THROW 50059, 'PRESCRIPTION_ITEM_ALREADY_SUPERSEDED', 1;
        END

        -- One PrescriptionItemAmendment diff row per old item - each may have carried a
        -- slightly different Dose/Quantity/etc. snapshot (e.g. if the source
        -- prescriptions were generated at different times), so each gets its own
        -- accurate before/after record rather than reusing just one.
        INSERT INTO dbo.PrescriptionItemAmendment
            (PatientMedicationId, PreviousPrescriptionItemId, ReplacementPrescriptionItemId, PreviousMedicineId, NewMedicineId,
             PreviousDose, NewDose, PreviousDoseUnitId, NewDoseUnitId, PreviousFrequencyId, NewFrequencyId,
             PreviousQuantity, NewQuantity, PreviousDuration, NewDuration, PreviousDurationUnitId, NewDurationUnitId,
             PreviousInstructions, NewInstructions, PreviousPRN, NewPRN, Reason, AmendedBy, AmendedDate)
        SELECT
            @PatientMedicationId, oi.PrescriptionItemId, @NewPrescriptionItemId, oi.MedicineId, @NewMedicineId,
            oi.Dose, @NewDose, oi.DoseUnitId, @NewDoseUnitId, oi.FrequencyId, @NewFrequencyId,
            oi.Quantity, @NewQuantity, oi.Duration, @NewDuration, oi.DurationUnitId, @NewDurationUnitId,
            oi.Instructions, @NewInstructions, oi.PRN, @NewPRN, @Reason, @AmendedBy, @AmendedDate
        FROM @OldItems AS oi;

        -- One PrescriptionItemReplacement row per old item, all pointing to the SAME new
        -- replacement item - UQ_PrescriptionItemReplacement_PreviousItem only enforces
        -- "an item can only ever be superseded once" (unique on PreviousPrescriptionItemId);
        -- it does not require ReplacementPrescriptionItemId to be unique, so
        -- many-old-items-to-one-new-item is already schema-legal, no migration needed.
        INSERT INTO dbo.PrescriptionItemReplacement
            (PreviousPrescriptionId, PreviousPrescriptionItemId, ReplacementPrescriptionId, ReplacementPrescriptionItemId,
             PreviousScid, ReplacementScid, Reason, CreatedBy, CreatedDate)
        SELECT
            oi.PrescriptionId, oi.PrescriptionItemId, @NewPrescriptionId, @NewPrescriptionItemId,
            oi.Scid, @NewScid, @Reason, @AmendedBy, @AmendedDate
        FROM @OldItems AS oi;

        -- Patient Medication and Prescription Synchronization: the new item's own link
        -- row - RelationshipType='REPLACEMENT', matching this new Prescription's own
        -- PENDING/"Active" status being reached directly, without a separate Finalize
        -- call.
        INSERT INTO dbo.PatientMedicationPrescription (PatientMedicationId, PrescriptionId, PrescriptionItemId, Scid, RelationshipType, CreatedBy)
        VALUES (@PatientMedicationId, @NewPrescriptionId, @NewPrescriptionItemId, @NewScid, 'REPLACEMENT', @AmendedBy);

        INSERT INTO dbo.PrescriptionAudit (PrescriptionId, Action, PreviousValues, NewValues, ChangedBy)
        VALUES (
            @NewPrescriptionId, 'CREATED_AS_REPLACEMENT', NULL,
            (SELECT @NewPrescriptionId AS PrescriptionId, @NewPrescriptionNumber AS PrescriptionNumber
             FOR JSON PATH, WITHOUT_ARRAY_WRAPPER),
            @AmendedBy
        );

        -- One SUPERSEDED history row per old item, and one REPLACEMENT_CREATED history
        -- row for the new item (unchanged - the new item was only ever created once).
        INSERT INTO dbo.PrescriptionItemHistory (PrescriptionItemId, Action, Notes, ChangedBy, ChangedDate)
        SELECT oi.PrescriptionItemId, 'SUPERSEDED',
               'Replaced by ' + @NewPrescriptionNumber + ' (new SCID ' + @NewScid + ')', @AmendedBy, @AmendedDate
        FROM @OldItems AS oi;

        INSERT INTO dbo.PrescriptionItemHistory (PrescriptionItemId, Action, Notes, ChangedBy, ChangedDate)
        VALUES (@NewPrescriptionItemId, 'REPLACEMENT_CREATED',
                'New SCID ' + @NewScid + '. Reason: ' + @Reason, @AmendedBy, @AmendedDate);

        -- Auto-cancel: for each DISTINCT original Prescription touched above, if it now
        -- has zero non-SUPERSEDED items, it no longer has any live content - cancel it.
        -- Set-based across however many distinct original prescriptions were involved
        -- (previously this only ever handled exactly one - see usp_Prescription_Cancel
        -- for the manual equivalent this mirrors).
        DECLARE @CancelledStatusId INT;
        SELECT @CancelledStatusId = PrescriptionStatusId FROM dbo.PrescriptionStatus WHERE Code = 'CANCELLED' AND IsActive = 1 AND IsDeleted = 0;

        DECLARE @CancelledPrescriptions TABLE (PrescriptionId INT);

        IF @CancelledStatusId IS NOT NULL
        BEGIN
            UPDATE p
            SET p.PrescriptionStatusId = @CancelledStatusId,
                p.UpdatedDate = @AmendedDate,
                p.UpdatedBy = @AmendedBy
            OUTPUT inserted.PrescriptionId INTO @CancelledPrescriptions
            FROM dbo.Prescription AS p
            WHERE p.PrescriptionId IN (SELECT DISTINCT PrescriptionId FROM @OldItems)
              AND p.PrescriptionStatusId NOT IN (
                  SELECT PrescriptionStatusId FROM dbo.PrescriptionStatus WHERE Code IN ('DRAFT', 'CANCELLED', 'DISPENSED')
              )
              AND NOT EXISTS (
                  SELECT 1 FROM dbo.PrescriptionItem AS pi2
                  WHERE pi2.PrescriptionId = p.PrescriptionId AND pi2.ItemStatus <> 'SUPERSEDED'
              );

            INSERT INTO dbo.PrescriptionCancellation (PrescriptionId, CancellationType, CancellationReason, Comments, CancelledBy, CancelledDate)
            SELECT
                cp.PrescriptionId, 'OTHER',
                'All medications on this prescription have been individually replaced.',
                'Automatically cancelled - every prescription item was superseded via Prescription Item Amendment.',
                @AmendedBy, @AmendedDate
            FROM @CancelledPrescriptions AS cp;

            INSERT INTO dbo.PrescriptionAudit (PrescriptionId, Action, PreviousValues, NewValues, ChangedBy, ChangedFields)
            SELECT
                cp.PrescriptionId, 'CANCELLED', NULL,
                (SELECT @CancelledStatusId AS PrescriptionStatusId FOR JSON PATH, WITHOUT_ARRAY_WRAPPER),
                @AmendedBy, 'All items superseded'
            FROM @CancelledPrescriptions AS cp;
        END

        COMMIT TRANSACTION;

        -- Two result sets: one row per distinct original prescription (each with its own
        -- OldScid, and its now-current status - CANCELLED if the above just cancelled
        -- it, unchanged otherwise), and one row for the single new replacement
        -- prescription.
        SELECT
            op.PrescriptionId AS OriginalPrescriptionId,
            op.PrescriptionNumber AS OriginalPrescriptionNumber,
            ops.Code AS OriginalStatusCode,
            ops.DisplayText AS OriginalStatusDisplayText,
            oi.Scid AS OldScid
        FROM (SELECT DISTINCT PrescriptionId, Scid FROM @OldItems) AS oi
        INNER JOIN dbo.Prescription AS op ON op.PrescriptionId = oi.PrescriptionId
        INNER JOIN dbo.PrescriptionStatus AS ops ON ops.PrescriptionStatusId = op.PrescriptionStatusId;

        SELECT
            np.PrescriptionId AS ReplacementPrescriptionId,
            np.PrescriptionNumber AS ReplacementPrescriptionNumber,
            nps.Code AS ReplacementStatusCode,
            nps.DisplayText AS ReplacementStatusDisplayText,
            @NewScid AS NewScid
        FROM dbo.Prescription AS np
        INNER JOIN dbo.PrescriptionStatus AS nps ON nps.PrescriptionStatusId = np.PrescriptionStatusId
        WHERE np.PrescriptionId = @NewPrescriptionId;
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
