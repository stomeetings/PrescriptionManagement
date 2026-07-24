-- Edits an Active medication's editable fields (api-spec.md section 4.7). Reconciled
-- from this task's "usp_PM_UpdatePatientMedication". No @PatientId/@MedicineId
-- parameters at all - both are immutable after creation (business spec section 5.5).
-- "Duplicate validation" (requested by this task) has no meaningful content here: since
-- PatientId/MedicineId cannot change, an Update can never create a new duplicate-active
-- situation that didn't already exist - flagged rather than fabricated as a no-op check.
CREATE OR ALTER PROCEDURE dbo.usp_PatientMedication_Update
    @PatientMedicationId INT,
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
    @RowVersion BINARY(8),
    @UpdatedBy NVARCHAR(100)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRY
        -- "Not stopped" (business spec section 5.5/5.7 - stopped medications are
        -- read-only) is checked before the UPDATE statement itself, since the
        -- RowVersion-based UPDATE ... WHERE below would otherwise silently match zero
        -- rows for a stopped record too, indistinguishable from "doesn't exist."
        IF NOT EXISTS (SELECT 1 FROM dbo.PatientMedication WHERE PatientMedicationId = @PatientMedicationId AND IsDeleted = 0)
        BEGIN
            THROW 50034, 'PATIENT_MEDICATION_NOT_FOUND', 1;
        END

        IF EXISTS (SELECT 1 FROM dbo.PatientMedication WHERE PatientMedicationId = @PatientMedicationId AND IsCurrent = 0)
        BEGIN
            THROW 50040, 'PATIENT_MEDICATION_STOPPED_READONLY', 1;
        END

        BEGIN TRANSACTION;

        DECLARE @PreviousValuesJson NVARCHAR(MAX);
        SELECT @PreviousValuesJson = (
            SELECT PatientMedicationId, Dose, DoseUnitId, FrequencyId, Duration, DurationUnitId,
                   Quantity, Instructions, PRN, StartDate, EndDate, ClinicalNotes,
                   PrescribedByUserAccountId
            FROM dbo.PatientMedication
            WHERE PatientMedicationId = @PatientMedicationId
            FOR JSON PATH, WITHOUT_ARRAY_WRAPPER
        );

        UPDATE dbo.PatientMedication
        SET
            Dose = @Dose,
            DoseUnitId = @DoseUnitId,
            FrequencyId = @FrequencyId,
            Duration = @Duration,
            DurationUnitId = @DurationUnitId,
            Quantity = @Quantity,
            Instructions = @Instructions,
            PRN = @PRN,
            StartDate = @StartDate,
            EndDate = @EndDate,
            ClinicalNotes = @ClinicalNotes,
            PrescribedByUserAccountId = @PrescribedByUserAccountId,
            UpdatedBy = @UpdatedBy,
            UpdatedDate = SYSUTCDATETIME()
        WHERE PatientMedicationId = @PatientMedicationId
          AND IsDeleted = 0
          AND RowVersion = @RowVersion;

        IF @@ROWCOUNT = 0
        BEGIN
            -- Row exists and is current (both already confirmed above), so a zero
            -- row-count here can only mean a stale RowVersion.
            THROW 50035, 'PATIENT_MEDICATION_CONCURRENCY_CONFLICT', 1;
        END

        DECLARE @NewValuesJson NVARCHAR(MAX);
        SELECT @NewValuesJson = (
            SELECT PatientMedicationId, Dose, DoseUnitId, FrequencyId, Duration, DurationUnitId,
                   Quantity, Instructions, PRN, StartDate, EndDate, ClinicalNotes,
                   PrescribedByUserAccountId
            FROM dbo.PatientMedication
            WHERE PatientMedicationId = @PatientMedicationId
            FOR JSON PATH, WITHOUT_ARRAY_WRAPPER
        );

        INSERT INTO dbo.PatientMedicationHistory (PatientMedicationId, Action, PreviousValues, NewValues, ChangedBy)
        VALUES (@PatientMedicationId, 'UPDATED', @PreviousValuesJson, @NewValuesJson, @UpdatedBy);

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF XACT_STATE() <> 0
        BEGIN
            ROLLBACK TRANSACTION;
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
