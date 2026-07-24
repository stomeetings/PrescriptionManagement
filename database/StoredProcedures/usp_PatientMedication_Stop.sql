-- Stops an Active medication (api-spec.md section 4.9). Reconciled from this task's
-- "usp_PM_StopPatientMedication". Not idempotent, unlike Patient/Medicine's Activate/
-- Deactivate: stopping an already-stopped medication is a 409-worthy conflict, since a
-- stopped record is permanently read-only (business spec section 5.7) - there is
-- nothing to "stop again."
-- EndDate is always set to the stop date here, overwriting any previously-planned
-- EndDate - this is this procedure's own interpretation (not explicitly specified
-- upstream): a Stop action is the authoritative record of when the medication actually
-- ended, superseding an earlier expected end date set at Create/Update time.
CREATE OR ALTER PROCEDURE dbo.usp_PatientMedication_Stop
    @PatientMedicationId INT,
    @PatientMedicationStatusId INT,
    @StoppedBy NVARCHAR(100)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRY
        IF NOT EXISTS (SELECT 1 FROM dbo.PatientMedication WHERE PatientMedicationId = @PatientMedicationId AND IsDeleted = 0)
        BEGIN
            THROW 50034, 'PATIENT_MEDICATION_NOT_FOUND', 1;
        END

        IF EXISTS (SELECT 1 FROM dbo.PatientMedication WHERE PatientMedicationId = @PatientMedicationId AND IsCurrent = 0)
        BEGIN
            THROW 50036, 'PATIENT_MEDICATION_ALREADY_STOPPED', 1;
        END

        BEGIN TRANSACTION;

        DECLARE @PreviousValuesJson NVARCHAR(MAX);
        SELECT @PreviousValuesJson = (
            SELECT PatientMedicationId, PatientMedicationStatusId, IsCurrent, EndDate
            FROM dbo.PatientMedication
            WHERE PatientMedicationId = @PatientMedicationId
            FOR JSON PATH, WITHOUT_ARRAY_WRAPPER
        );

        UPDATE dbo.PatientMedication
        SET
            IsCurrent = 0,
            PatientMedicationStatusId = @PatientMedicationStatusId,
            EndDate = CAST(SYSUTCDATETIME() AS DATE),
            StoppedDate = SYSUTCDATETIME(),
            StoppedBy = @StoppedBy,
            UpdatedBy = @StoppedBy,
            UpdatedDate = SYSUTCDATETIME()
        WHERE PatientMedicationId = @PatientMedicationId
          AND IsDeleted = 0
          AND IsCurrent = 1;

        IF @@ROWCOUNT = 0
        BEGIN
            -- Existence and not-already-stopped were both confirmed above; a
            -- concurrent Stop between that check and this UPDATE is the only remaining
            -- explanation.
            THROW 50036, 'PATIENT_MEDICATION_ALREADY_STOPPED', 1;
        END

        DECLARE @NewValuesJson NVARCHAR(MAX);
        SELECT @NewValuesJson = (
            SELECT PatientMedicationId, PatientMedicationStatusId, IsCurrent, EndDate, StoppedDate, StoppedBy
            FROM dbo.PatientMedication
            WHERE PatientMedicationId = @PatientMedicationId
            FOR JSON PATH, WITHOUT_ARRAY_WRAPPER
        );

        INSERT INTO dbo.PatientMedicationHistory (PatientMedicationId, Action, PreviousValues, NewValues, ChangedBy)
        VALUES (@PatientMedicationId, 'STOPPED', @PreviousValuesJson, @NewValuesJson, @StoppedBy);

        COMMIT TRANSACTION;
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
