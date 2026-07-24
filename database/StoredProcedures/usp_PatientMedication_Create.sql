-- Adds a medication to a patient's current list (api-spec.md section 4.6). Reconciled
-- from this task's "usp_PM_CreatePatientMedication". Takes already-resolved lookup IDs
-- (@DoseUnitId/@FrequencyId/@DurationUnitId/@PatientMedicationSourceId/
-- @PatientMedicationStatusId), not codes - the Service layer resolves codes to IDs,
-- matching every prior module's Create procedure (e.g. usp_Patient_Create takes
-- @GenderId, not @GenderCode). @PatientMedicationSourceId/@PatientMedicationStatusId are
-- still parameters here (not hardcoded to MANUAL_ENTRY/ACTIVE) so this procedure stays
-- reusable for a future internal caller (e.g. a Prescription-triggered creation) - the
-- approved api-spec.md's rule that this specific public endpoint always passes
-- MANUAL_ENTRY is a Service/Controller-layer decision, not baked in here.
CREATE OR ALTER PROCEDURE dbo.usp_PatientMedication_Create
    @PatientId INT,
    @MedicineId INT,
    @Dose DECIMAL(10,3),
    @DoseUnitId INT,
    @FrequencyId INT,
    @Duration INT,
    @DurationUnitId INT,
    @Quantity DECIMAL(10,2),
    @Instructions NVARCHAR(500),
    @PRN BIT,
    @StartDate DATE,
    @EndDate DATE = NULL,
    @ClinicalNotes NVARCHAR(MAX) = NULL,
    @PrescribedByUserAccountId INT = NULL,
    @PatientMedicationSourceId INT,
    @PatientMedicationStatusId INT,
    @CreatedBy NVARCHAR(100),
    @PatientMedicationId INT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRY
        -- Business validation (patient-medication-management.md section 6):
        IF NOT EXISTS (SELECT 1 FROM dbo.Patient WHERE PatientId = @PatientId AND IsActive = 1 AND IsDeleted = 0)
        BEGIN
            THROW 50031, 'INVALID_PATIENT', 1;
        END

        IF NOT EXISTS (SELECT 1 FROM dbo.Medicine WHERE MedicineId = @MedicineId AND IsActive = 1 AND IsDeleted = 0)
        BEGIN
            THROW 50032, 'INVALID_MEDICINE', 1;
        END

        -- Explicit pre-check for a clean, specific error - the filtered unique index
        -- UQ_PatientMedication_Patient_Medicine_Current remains the authoritative,
        -- race-condition-proof guard (caught below in the CATCH block).
        IF EXISTS (
            SELECT 1 FROM dbo.PatientMedication
            WHERE PatientId = @PatientId AND MedicineId = @MedicineId AND IsCurrent = 1 AND IsDeleted = 0
        )
        BEGIN
            THROW 50033, 'DUPLICATE_ACTIVE_MEDICATION', 1;
        END

        BEGIN TRANSACTION;

        INSERT INTO dbo.PatientMedication
            (PatientId, MedicineId, Dose, DoseUnitId, FrequencyId, Duration, DurationUnitId,
             Quantity, Instructions, PRN, StartDate, EndDate, ClinicalNotes,
             PrescribedByUserAccountId, PatientMedicationSourceId, PatientMedicationStatusId,
             CreatedBy)
        VALUES
            (@PatientId, @MedicineId, @Dose, @DoseUnitId, @FrequencyId, @Duration, @DurationUnitId,
             @Quantity, @Instructions, @PRN, @StartDate, @EndDate, @ClinicalNotes,
             @PrescribedByUserAccountId, @PatientMedicationSourceId, @PatientMedicationStatusId,
             @CreatedBy);

        SET @PatientMedicationId = SCOPE_IDENTITY();

        -- History: CREATED action, no PreviousValues (nothing existed before this row).
        DECLARE @NewValuesJson NVARCHAR(MAX);
        SELECT @NewValuesJson = (
            SELECT PatientMedicationId, PatientId, MedicineId, Dose, DoseUnitId, FrequencyId,
                   Duration, DurationUnitId, Quantity, Instructions, PRN, StartDate, EndDate,
                   ClinicalNotes, PatientMedicationStatusId, IsCurrent
            FROM dbo.PatientMedication
            WHERE PatientMedicationId = @PatientMedicationId
            FOR JSON PATH, WITHOUT_ARRAY_WRAPPER
        );

        INSERT INTO dbo.PatientMedicationHistory (PatientMedicationId, Action, PreviousValues, NewValues, ChangedBy)
        VALUES (@PatientMedicationId, 'CREATED', NULL, @NewValuesJson, @CreatedBy);

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF XACT_STATE() <> 0
        BEGIN
            ROLLBACK TRANSACTION;
        END

        -- Filtered-unique-index violation (race condition beyond the pre-check above).
        IF ERROR_NUMBER() IN (2627, 2601) AND ERROR_MESSAGE() LIKE '%UQ_PatientMedication_Patient_Medicine_Current%'
        BEGIN
            THROW 50033, 'DUPLICATE_ACTIVE_MEDICATION', 1;
        END

        -- CHECK constraint violations (error 547) are translated into meaningful,
        -- distinguishable errors here - unlike Medicine Management's ATC-code CHECK
        -- constraint, which was left untranslated (a gap flagged in that module's code
        -- review). This procedure fixes that class of gap for this module.
        IF ERROR_NUMBER() = 547
        BEGIN
            IF ERROR_MESSAGE() LIKE '%CK_PatientMedication_EndDate%'
            BEGIN
                THROW 50038, 'INVALID_DATE_RANGE', 1;
            END

            THROW 50039, 'INVALID_MEDICATION_DATA', 1;
        END

        THROW;
    END CATCH
END
GO
