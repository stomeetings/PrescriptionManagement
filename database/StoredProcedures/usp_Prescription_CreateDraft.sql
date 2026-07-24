-- Persists a Prescription at Draft status plus its PrescriptionItem lines and a CREATED
-- PrescriptionAudit row, in one transaction (database-spec.md section 5: "at least one
-- medication" is enforced here, not by a CHECK constraint, since SQL Server cannot
-- express a parent-must-have-children rule as a table-level CHECK). @ItemsJson is a JSON
-- array (one object per medication) shredded via OPENJSON - no User-Defined Table Type
-- precedent exists yet in this project, and this keeps the calling convention consistent
-- with this project's existing FOR JSON PATH usage elsewhere (audit snapshots).
-- Custom error range 50041-50047 (Prescription Management), the next free block after
-- Patient Medication Management's 50031-50040.
-- ItemStatus is set explicitly to 'ACTIVE' on every inserted item, rather than relying on
-- DF_PrescriptionItem_ItemStatus's default value - found (via a Save Draft failure,
-- 2026-07-22) to be missing from at least one deployed database despite
-- 061_AlterPrescriptionItem_AddItemStatusAndScid.sql defining it (079_...sql restores
-- the default itself, but every PrescriptionItem-inserting procedure now also sets this
-- explicitly, so a missing/dropped default constraint can't silently break this again).
CREATE OR ALTER PROCEDURE dbo.usp_Prescription_CreateDraft
    @DraftPrescriptionId UNIQUEIDENTIFIER,
    @PatientId INT,
    @ProviderUserAccountId INT,
    @Xhtml NVARCHAR(MAX),
    @ClinicalNotes NVARCHAR(MAX) = NULL,
    @IssueDate DATE,
    @ItemsJson NVARCHAR(MAX),
    @CreatedBy NVARCHAR(100),
    @PrescriptionId INT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRY
        -- Business validation (database-spec.md section 5 / prescription-management.md
        -- section 7):
        IF NOT EXISTS (SELECT 1 FROM dbo.Patient WHERE PatientId = @PatientId AND IsActive = 1 AND IsDeleted = 0)
        BEGIN
            THROW 50041, 'INVALID_PATIENT', 1;
        END

        IF NOT EXISTS (SELECT 1 FROM dbo.UserAccount WHERE UserAccountId = @ProviderUserAccountId AND IsActive = 1 AND IsDeleted = 0)
        BEGIN
            THROW 50042, 'INVALID_PROVIDER', 1;
        END

        IF @Xhtml IS NULL OR LEN(@Xhtml) = 0
        BEGIN
            THROW 50043, 'MISSING_XHTML', 1;
        END

        IF NOT EXISTS (SELECT 1 FROM OPENJSON(@ItemsJson))
        BEGIN
            THROW 50044, 'NO_MEDICATIONS', 1;
        END

        -- Explicit pre-check for a clean, specific error - UQ_Prescription_
        -- DraftPrescriptionId remains the authoritative, race-condition-proof guard
        -- (caught below in the CATCH block).
        IF EXISTS (SELECT 1 FROM dbo.Prescription WHERE DraftPrescriptionId = @DraftPrescriptionId)
        BEGIN
            THROW 50045, 'DUPLICATE_DRAFT', 1;
        END

        DECLARE @PrescriptionStatusId INT;
        SELECT @PrescriptionStatusId = PrescriptionStatusId
        FROM dbo.PrescriptionStatus
        WHERE Code = 'DRAFT' AND IsActive = 1 AND IsDeleted = 0;

        IF @PrescriptionStatusId IS NULL
        BEGIN
            THROW 50047, 'DRAFT_STATUS_NOT_SEEDED', 1;
        END

        DECLARE @PrescriptionNumber NVARCHAR(50) =
            'RX-' + RIGHT('000000' + CAST(NEXT VALUE FOR dbo.Prescription_PrescriptionNumberSequence AS NVARCHAR(10)), 6);

        BEGIN TRANSACTION;

        INSERT INTO dbo.Prescription
            (PrescriptionNumber, DraftPrescriptionId, PatientId, ProviderUserAccountId, PrescriptionStatusId,
             ClinicalNotes, Xhtml, IssueDate, CreatedBy)
        VALUES
            (@PrescriptionNumber, @DraftPrescriptionId, @PatientId, @ProviderUserAccountId, @PrescriptionStatusId,
             @ClinicalNotes, @Xhtml, @IssueDate, @CreatedBy);

        SET @PrescriptionId = SCOPE_IDENTITY();

        INSERT INTO dbo.PrescriptionItem
            (PrescriptionId, PatientMedicationId, MedicineId, MedicineNameSnapshot, GenericNameSnapshot,
             StrengthSnapshot, DosageFormSnapshot, RouteSnapshot, Dose, DoseUnitId, DoseUnitSnapshot,
             FrequencyId, FrequencySnapshot, Duration, DurationUnitId, DurationUnitSnapshot, Quantity,
             Instructions, PRN, ItemStatus, CreatedBy)
        SELECT
            @PrescriptionId, Item.PatientMedicationId, Item.MedicineId, Item.MedicineName, Item.GenericName,
            Item.Strength, Item.DosageForm, Item.Route, Item.Dose, Item.DoseUnitId, Item.DoseUnit,
            Item.FrequencyId, Item.Frequency, Item.Duration, Item.DurationUnitId, Item.DurationUnit, Item.Quantity,
            Item.Instructions, Item.PRN, 'ACTIVE', @CreatedBy
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

        -- Audit: CREATED action, no PreviousValues (nothing existed before this row).
        DECLARE @NewValuesJson NVARCHAR(MAX);
        SELECT @NewValuesJson = (
            SELECT PrescriptionId, PrescriptionNumber, PatientId, ProviderUserAccountId,
                   PrescriptionStatusId, IssueDate, ExpiryDate
            FROM dbo.Prescription
            WHERE PrescriptionId = @PrescriptionId
            FOR JSON PATH, WITHOUT_ARRAY_WRAPPER
        );

        INSERT INTO dbo.PrescriptionAudit (PrescriptionId, Action, PreviousValues, NewValues, ChangedBy, VersionNumber, ChangedFields)
        VALUES (@PrescriptionId, 'CREATED', NULL, @NewValuesJson, @CreatedBy, 1, NULL);

        -- Step 18.7: seeds Version 1 - every Prescription's history starts here, not as
        -- a side effect of the first Edit. Mirrors the just-inserted Prescription/
        -- PrescriptionItem rows exactly (same transaction, so they can never disagree).
        DECLARE @PrescriptionVersionId INT;

        INSERT INTO dbo.PrescriptionVersion
            (PrescriptionId, VersionNumber, ClinicalNotes, Xhtml, PrescriptionStatusId, ChangeSummary, CreatedBy)
        VALUES
            (@PrescriptionId, 1, @ClinicalNotes, @Xhtml, @PrescriptionStatusId, 'Initial draft saved', @CreatedBy);

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

        COMMIT TRANSACTION;

        -- Returned alongside the @PrescriptionId OUTPUT so the caller gets the
        -- system-generated PrescriptionNumber/Status/audit values in the same round
        -- trip, without a separate GetById call this step doesn't otherwise need.
        SELECT
            p.PrescriptionId,
            p.PrescriptionNumber,
            ps.Code AS StatusCode,
            ps.DisplayText AS StatusDisplayText,
            p.CreatedDate,
            p.CreatedBy,
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

        -- Unique-index violation (race condition beyond the pre-check above).
        IF ERROR_NUMBER() IN (2627, 2601) AND ERROR_MESSAGE() LIKE '%UQ_Prescription_DraftPrescriptionId%'
        BEGIN
            THROW 50045, 'DUPLICATE_DRAFT', 1;
        END

        IF ERROR_NUMBER() = 547
        BEGIN
            THROW 50046, 'INVALID_PRESCRIPTION_DATA', 1;
        END

        THROW;
    END CATCH
END
GO
