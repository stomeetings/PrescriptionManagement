-- Creates a new Active PatientMedication record from a Stopped one - does NOT reactivate
-- the old record in place, preserving historical accuracy (business spec section 5.8,
-- api-spec.md section 4.10). Reconciled from this task's "usp_PM_ResumePatientMedication".
-- Every clinical parameter except @StartDate is optional: NULL means "copy from the
-- stopped source record," matching the approved api-spec.md's "editable defaults"
-- design. @EndDate is deliberately NOT copied from the source if omitted - it stays
-- NULL, since a resumed course is a fresh clinical decision, not a continuation of the
-- old course's original expected end date.
CREATE OR ALTER PROCEDURE dbo.usp_PatientMedication_Resume
    @PatientMedicationId INT,
    @StartDate DATE,
    @Dose DECIMAL(10,3) = NULL,
    @DoseUnitId INT = NULL,
    @FrequencyId INT = NULL,
    @Duration INT = NULL,
    @DurationUnitId INT = NULL,
    @Quantity DECIMAL(10,2) = NULL,
    @Instructions NVARCHAR(500) = NULL,
    @PRN BIT = NULL,
    @EndDate DATE = NULL,
    @ClinicalNotes NVARCHAR(MAX) = NULL,
    @PrescribedByUserAccountId INT = NULL,
    @PatientMedicationStatusId INT,
    @ResumedBy NVARCHAR(100),
    @NewPatientMedicationId INT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRY
        DECLARE @SourcePatientId INT, @SourceMedicineId INT, @SourcePatientMedicationSourceId INT;
        DECLARE @SourceDose DECIMAL(10,3), @SourceDoseUnitId INT, @SourceFrequencyId INT;
        DECLARE @SourceDuration INT, @SourceDurationUnitId INT, @SourceQuantity DECIMAL(10,2);
        DECLARE @SourceInstructions NVARCHAR(500), @SourcePRN BIT, @SourceClinicalNotes NVARCHAR(MAX);
        DECLARE @SourcePrescribedByUserAccountId INT;

        SELECT
            @SourcePatientId = PatientId,
            @SourceMedicineId = MedicineId,
            @SourcePatientMedicationSourceId = PatientMedicationSourceId,
            @SourceDose = Dose,
            @SourceDoseUnitId = DoseUnitId,
            @SourceFrequencyId = FrequencyId,
            @SourceDuration = Duration,
            @SourceDurationUnitId = DurationUnitId,
            @SourceQuantity = Quantity,
            @SourceInstructions = Instructions,
            @SourcePRN = PRN,
            @SourceClinicalNotes = ClinicalNotes,
            @SourcePrescribedByUserAccountId = PrescribedByUserAccountId
        FROM dbo.PatientMedication
        WHERE PatientMedicationId = @PatientMedicationId
          AND IsDeleted = 0;

        IF @SourcePatientId IS NULL
        BEGIN
            THROW 50034, 'PATIENT_MEDICATION_NOT_FOUND', 1;
        END

        IF EXISTS (SELECT 1 FROM dbo.PatientMedication WHERE PatientMedicationId = @PatientMedicationId AND IsCurrent = 1)
        BEGIN
            THROW 50037, 'PATIENT_MEDICATION_NOT_STOPPED', 1;
        END

        -- Re-validate patient/medicine are still active - the same eligibility rules
        -- that apply to a fresh Add Medication apply to a Resume too (business spec
        -- section 6), since a Resume is clinically a new course.
        IF NOT EXISTS (SELECT 1 FROM dbo.Patient WHERE PatientId = @SourcePatientId AND IsActive = 1 AND IsDeleted = 0)
        BEGIN
            THROW 50031, 'INVALID_PATIENT', 1;
        END

        IF NOT EXISTS (SELECT 1 FROM dbo.Medicine WHERE MedicineId = @SourceMedicineId AND IsActive = 1 AND IsDeleted = 0)
        BEGIN
            THROW 50032, 'INVALID_MEDICINE', 1;
        END

        -- Defense-in-depth: normally trivially satisfied, since the stopped source
        -- vacated the IsCurrent slot when it was stopped.
        IF EXISTS (
            SELECT 1 FROM dbo.PatientMedication
            WHERE PatientId = @SourcePatientId AND MedicineId = @SourceMedicineId AND IsCurrent = 1 AND IsDeleted = 0
        )
        BEGIN
            THROW 50033, 'DUPLICATE_ACTIVE_MEDICATION', 1;
        END

        BEGIN TRANSACTION;

        INSERT INTO dbo.PatientMedication
            (PatientId, MedicineId, Dose, DoseUnitId, FrequencyId, Duration, DurationUnitId,
             Quantity, Instructions, PRN, StartDate, EndDate, ClinicalNotes,
             PrescribedByUserAccountId, PatientMedicationSourceId, PatientMedicationStatusId,
             ResumedFromPatientMedicationId, CreatedBy)
        VALUES
            (@SourcePatientId, @SourceMedicineId,
             COALESCE(@Dose, @SourceDose),
             COALESCE(@DoseUnitId, @SourceDoseUnitId),
             COALESCE(@FrequencyId, @SourceFrequencyId),
             COALESCE(@Duration, @SourceDuration),
             COALESCE(@DurationUnitId, @SourceDurationUnitId),
             COALESCE(@Quantity, @SourceQuantity),
             COALESCE(@Instructions, @SourceInstructions),
             COALESCE(@PRN, @SourcePRN),
             @StartDate,
             @EndDate,
             COALESCE(@ClinicalNotes, @SourceClinicalNotes),
             COALESCE(@PrescribedByUserAccountId, @SourcePrescribedByUserAccountId),
             @SourcePatientMedicationSourceId,
             @PatientMedicationStatusId,
             @PatientMedicationId,
             @ResumedBy);

        SET @NewPatientMedicationId = SCOPE_IDENTITY();

        -- History is logged against the NEW record: PreviousValues is a snapshot of the
        -- stopped source it resumed from, NewValues is the new record itself. The
        -- self-referencing ResumedFromPatientMedicationId link is what lets a caller
        -- reconstruct the full chain across multiple Stop/Resume cycles.
        DECLARE @PreviousValuesJson NVARCHAR(MAX);
        SELECT @PreviousValuesJson = (
            SELECT PatientMedicationId, Dose, DoseUnitId, FrequencyId, Duration, DurationUnitId,
                   Quantity, Instructions, PRN, StartDate, EndDate, ClinicalNotes
            FROM dbo.PatientMedication
            WHERE PatientMedicationId = @PatientMedicationId
            FOR JSON PATH, WITHOUT_ARRAY_WRAPPER
        );

        DECLARE @NewValuesJson NVARCHAR(MAX);
        SELECT @NewValuesJson = (
            SELECT PatientMedicationId, PatientId, MedicineId, Dose, DoseUnitId, FrequencyId,
                   Duration, DurationUnitId, Quantity, Instructions, PRN, StartDate, EndDate,
                   ClinicalNotes, PatientMedicationStatusId, IsCurrent, ResumedFromPatientMedicationId
            FROM dbo.PatientMedication
            WHERE PatientMedicationId = @NewPatientMedicationId
            FOR JSON PATH, WITHOUT_ARRAY_WRAPPER
        );

        INSERT INTO dbo.PatientMedicationHistory (PatientMedicationId, Action, PreviousValues, NewValues, ChangedBy)
        VALUES (@NewPatientMedicationId, 'RESUMED', @PreviousValuesJson, @NewValuesJson, @ResumedBy);

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF XACT_STATE() <> 0
        BEGIN
            ROLLBACK TRANSACTION;
        END

        IF ERROR_NUMBER() IN (2627, 2601) AND ERROR_MESSAGE() LIKE '%UQ_PatientMedication_Patient_Medicine_Current%'
        BEGIN
            THROW 50033, 'DUPLICATE_ACTIVE_MEDICATION', 1;
        END

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
