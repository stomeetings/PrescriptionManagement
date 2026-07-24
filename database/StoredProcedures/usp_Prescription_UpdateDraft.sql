-- Step 18.7's own prerequisite: a real, minimal Edit for a saved Prescription (Clinical
-- Notes + the medication item list) that creates a new PrescriptionVersion every time -
-- "every meaningful change creates a new version; no version is ever overwritten." Only
-- Draft-status prescriptions are editable, mirroring Patient Medication's "stopped is
-- read-only" precedent. Uses the same item-replacement strategy already anticipated by
-- database-spec.md section 3.2 (delete + re-insert the whole set, not row-by-row
-- diff-and-patch) - the change-detection below is computed separately, before the old
-- rows are gone.
-- Custom error range extended: 50048 PRESCRIPTION_NOT_FOUND, 50049
-- PRESCRIPTION_NOT_EDITABLE, 50050 PRESCRIPTION_CONCURRENCY_CONFLICT (50044/50046 reused
-- from usp_Prescription_CreateDraft for the same conditions).
CREATE OR ALTER PROCEDURE dbo.usp_Prescription_UpdateDraft
    @PrescriptionId INT,
    @ClinicalNotes NVARCHAR(MAX) = NULL,
    @Xhtml NVARCHAR(MAX),
    @ItemsJson NVARCHAR(MAX),
    @RowVersion BINARY(8),
    @UpdatedBy NVARCHAR(100)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRY
        IF NOT EXISTS (SELECT 1 FROM dbo.Prescription WHERE PrescriptionId = @PrescriptionId AND IsDeleted = 0)
        BEGIN
            THROW 50048, 'PRESCRIPTION_NOT_FOUND', 1;
        END

        IF EXISTS (
            SELECT 1 FROM dbo.Prescription AS p
            INNER JOIN dbo.PrescriptionStatus AS ps ON ps.PrescriptionStatusId = p.PrescriptionStatusId
            WHERE p.PrescriptionId = @PrescriptionId AND ps.Code <> 'DRAFT'
        )
        BEGIN
            THROW 50049, 'PRESCRIPTION_NOT_EDITABLE', 1;
        END

        IF @Xhtml IS NULL OR LEN(@Xhtml) = 0
        BEGIN
            THROW 50043, 'MISSING_XHTML', 1;
        END

        IF NOT EXISTS (SELECT 1 FROM OPENJSON(@ItemsJson))
        BEGIN
            THROW 50044, 'NO_MEDICATIONS', 1;
        END

        DECLARE @PreviousClinicalNotes NVARCHAR(MAX), @PrescriptionStatusId INT;
        SELECT @PreviousClinicalNotes = ClinicalNotes, @PrescriptionStatusId = PrescriptionStatusId
        FROM dbo.Prescription
        WHERE PrescriptionId = @PrescriptionId;

        -- Captured before the DELETE below, so change detection has something to
        -- compare the new item set against.
        DECLARE @PreviousItems TABLE (MedicineId INT, Dose DECIMAL(10,3), FrequencyId INT, Quantity DECIMAL(10,2), Instructions NVARCHAR(500));
        INSERT INTO @PreviousItems (MedicineId, Dose, FrequencyId, Quantity, Instructions)
        SELECT MedicineId, Dose, FrequencyId, Quantity, Instructions
        FROM dbo.PrescriptionItem
        WHERE PrescriptionId = @PrescriptionId;

        DECLARE @PreviousValuesJson NVARCHAR(MAX);
        SELECT @PreviousValuesJson = (
            SELECT PrescriptionId, ClinicalNotes
            FROM dbo.Prescription
            WHERE PrescriptionId = @PrescriptionId
            FOR JSON PATH, WITHOUT_ARRAY_WRAPPER
        );

        BEGIN TRANSACTION;

        UPDATE dbo.Prescription
        SET ClinicalNotes = @ClinicalNotes,
            Xhtml = @Xhtml,
            UpdatedBy = @UpdatedBy,
            UpdatedDate = SYSUTCDATETIME()
        WHERE PrescriptionId = @PrescriptionId
          AND IsDeleted = 0
          AND RowVersion = @RowVersion;

        IF @@ROWCOUNT = 0
        BEGIN
            -- Existence and editability (Draft status) were both already confirmed
            -- above, so a zero row-count here can only mean a stale RowVersion.
            THROW 50050, 'PRESCRIPTION_CONCURRENCY_CONFLICT', 1;
        END

        DELETE FROM dbo.PrescriptionItem WHERE PrescriptionId = @PrescriptionId;

        INSERT INTO dbo.PrescriptionItem
            (PrescriptionId, PatientMedicationId, MedicineId, MedicineNameSnapshot, GenericNameSnapshot,
             StrengthSnapshot, DosageFormSnapshot, RouteSnapshot, Dose, DoseUnitId, DoseUnitSnapshot,
             FrequencyId, FrequencySnapshot, Duration, DurationUnitId, DurationUnitSnapshot, Quantity,
             Instructions, PRN, ItemStatus, CreatedBy)
        SELECT
            @PrescriptionId, Item.PatientMedicationId, Item.MedicineId, Item.MedicineName, Item.GenericName,
            Item.Strength, Item.DosageForm, Item.Route, Item.Dose, Item.DoseUnitId, Item.DoseUnit,
            Item.FrequencyId, Item.Frequency, Item.Duration, Item.DurationUnitId, Item.DurationUnit,
            Item.Quantity, Item.Instructions, Item.PRN, 'ACTIVE', @UpdatedBy
        FROM OPENJSON(@ItemsJson) WITH (
            PatientMedicationId INT            '$.patientMedicationId',
            MedicineId           INT           '$.medicineId',
            MedicineName          NVARCHAR(200) '$.medicineName',
            GenericName            NVARCHAR(200) '$.genericName',
            Strength                NVARCHAR(50) '$.strength',
            DosageForm               NVARCHAR(150) '$.dosageForm',
            Route                     NVARCHAR(150) '$.route',
            Dose                       DECIMAL(10,3) '$.dose',
            DoseUnitId                  INT '$.doseUnitId',
            DoseUnit                     NVARCHAR(150) '$.doseUnit',
            FrequencyId                    INT '$.frequencyId',
            Frequency                       NVARCHAR(150) '$.frequency',
            Duration                          INT '$.duration',
            DurationUnitId                      INT '$.durationUnitId',
            DurationUnit                          NVARCHAR(150) '$.durationUnit',
            Quantity                                DECIMAL(10,2) '$.quantity',
            Instructions                              NVARCHAR(500) '$.instructions',
            PRN                                         BIT '$.prn'
        ) AS Item;

        -- Change detection (best-effort, not an exhaustive field-by-field diff of every
        -- possible attribute - this step's own Track Changes list drives what's checked
        -- here). Medication identity is compared by MedicineId; a medicine present in
        -- both sets but with a different Dose/FrequencyId/Quantity/Instructions counts
        -- as "modified", not "removed + added".
        DECLARE @ClinicalNotesChanged BIT = CASE WHEN ISNULL(@PreviousClinicalNotes, N'') <> ISNULL(@ClinicalNotes, N'') THEN 1 ELSE 0 END;

        DECLARE @MedicationsAdded BIT = CASE WHEN EXISTS (
            SELECT MedicineId FROM dbo.PrescriptionItem WHERE PrescriptionId = @PrescriptionId
            EXCEPT
            SELECT MedicineId FROM @PreviousItems
        ) THEN 1 ELSE 0 END;

        DECLARE @MedicationsRemoved BIT = CASE WHEN EXISTS (
            SELECT MedicineId FROM @PreviousItems
            EXCEPT
            SELECT MedicineId FROM dbo.PrescriptionItem WHERE PrescriptionId = @PrescriptionId
        ) THEN 1 ELSE 0 END;

        DECLARE @MedicationsModified BIT = CASE WHEN EXISTS (
            SELECT n.MedicineId, n.Dose, n.FrequencyId, n.Quantity, n.Instructions
            FROM dbo.PrescriptionItem n
            INNER JOIN @PreviousItems p ON p.MedicineId = n.MedicineId
            WHERE n.PrescriptionId = @PrescriptionId
              AND (n.Dose <> p.Dose OR n.FrequencyId <> p.FrequencyId OR n.Quantity <> p.Quantity OR n.Instructions <> p.Instructions)
        ) THEN 1 ELSE 0 END;

        DECLARE @ChangedFields NVARCHAR(500) = NULLIF(LTRIM(
            CASE WHEN @MedicationsAdded = 1 THEN 'MedicationsAdded, ' ELSE '' END +
            CASE WHEN @MedicationsRemoved = 1 THEN 'MedicationsRemoved, ' ELSE '' END +
            CASE WHEN @MedicationsModified = 1 THEN 'MedicationsModified, ' ELSE '' END +
            CASE WHEN @ClinicalNotesChanged = 1 THEN 'ClinicalNotes, ' ELSE '' END
        ), '');
        SET @ChangedFields = LEFT(@ChangedFields, LEN(@ChangedFields) - 1); -- trim trailing comma

        DECLARE @ChangeSummary NVARCHAR(500) = ISNULL(@ChangedFields, 'No tracked fields changed');

        -- Version snapshot: VersionNumber = current max + 1 - never overwrites an
        -- existing PrescriptionVersion row.
        DECLARE @NewVersionNumber INT;
        SELECT @NewVersionNumber = ISNULL(MAX(VersionNumber), 0) + 1 FROM dbo.PrescriptionVersion WHERE PrescriptionId = @PrescriptionId;

        DECLARE @PrescriptionVersionId INT;
        INSERT INTO dbo.PrescriptionVersion
            (PrescriptionId, VersionNumber, ClinicalNotes, Xhtml, PrescriptionStatusId, ChangeSummary, CreatedBy)
        VALUES
            (@PrescriptionId, @NewVersionNumber, @ClinicalNotes, @Xhtml, @PrescriptionStatusId, @ChangeSummary, @UpdatedBy);

        SET @PrescriptionVersionId = SCOPE_IDENTITY();

        INSERT INTO dbo.PrescriptionVersionItem
            (PrescriptionVersionId, PatientMedicationId, MedicineId, MedicineNameSnapshot, GenericNameSnapshot,
             StrengthSnapshot, DosageFormSnapshot, RouteSnapshot, Dose, DoseUnitId, DoseUnitSnapshot,
             FrequencyId, FrequencySnapshot, Duration, DurationUnitId, DurationUnitSnapshot, Quantity,
             Instructions, PRN)
        SELECT
            @PrescriptionVersionId, PatientMedicationId, MedicineId, MedicineNameSnapshot, GenericNameSnapshot,
            StrengthSnapshot, DosageFormSnapshot, RouteSnapshot, Dose, DoseUnitId, DoseUnitSnapshot,
            FrequencyId, FrequencySnapshot, Duration, DurationUnitId, DurationUnitSnapshot, Quantity,
            Instructions, PRN
        FROM dbo.PrescriptionItem
        WHERE PrescriptionId = @PrescriptionId;

        DECLARE @NewValuesJson NVARCHAR(MAX);
        SELECT @NewValuesJson = (
            SELECT PrescriptionId, ClinicalNotes
            FROM dbo.Prescription
            WHERE PrescriptionId = @PrescriptionId
            FOR JSON PATH, WITHOUT_ARRAY_WRAPPER
        );

        INSERT INTO dbo.PrescriptionAudit (PrescriptionId, Action, PreviousValues, NewValues, ChangedBy, VersionNumber, ChangedFields)
        VALUES (@PrescriptionId, 'UPDATED', @PreviousValuesJson, @NewValuesJson, @UpdatedBy, @NewVersionNumber, @ChangedFields);

        COMMIT TRANSACTION;

        SELECT
            p.PrescriptionId,
            p.PrescriptionNumber,
            ps.Code AS StatusCode,
            ps.DisplayText AS StatusDisplayText,
            @NewVersionNumber AS VersionNumber,
            p.UpdatedDate,
            p.UpdatedBy,
            p.RowVersion
        FROM dbo.Prescription AS p
        INNER JOIN dbo.PrescriptionStatus AS ps ON ps.PrescriptionStatusId = p.PrescriptionStatusId
        WHERE p.PrescriptionId = @PrescriptionId;
    END TRY
    BEGIN CATCH
        IF XACT_STATE() <> 0
        BEGIN
            ROLLBACK TRANSACTION;
        END

        IF ERROR_NUMBER() = 547
        BEGIN
            THROW 50046, 'INVALID_PRESCRIPTION_DATA', 1;
        END

        THROW;
    END CATCH
END
GO
