-- Step 18.7: restores a historical version's content (ClinicalNotes/Xhtml/items) onto
-- the live Prescription, then snapshots that restored state as a brand-new version -
-- "Restore creates a NEW latest version, never overwrites history." The live
-- Prescription's PrescriptionStatusId is deliberately left untouched (restore changes
-- WHAT the draft says, not what lifecycle state it's in); the new PrescriptionVersion
-- row is snapshotted at the prescription's CURRENT status, not the source version's
-- historical status, since VersionNumber+1 is happening now, in the current status.
-- Only Draft-status prescriptions are restorable, same editability rule as
-- usp_Prescription_UpdateDraft. Error 50051 PRESCRIPTION_VERSION_NOT_FOUND reused from
-- usp_PrescriptionVersion_GetByVersion.
CREATE OR ALTER PROCEDURE dbo.usp_Prescription_RestoreVersion
    @PrescriptionId INT,
    @VersionNumber INT,
    @RestoredBy NVARCHAR(100)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRY
        DECLARE @CurrentPrescriptionStatusId INT;

        SELECT @CurrentPrescriptionStatusId = PrescriptionStatusId
        FROM dbo.Prescription
        WHERE PrescriptionId = @PrescriptionId AND IsDeleted = 0;

        IF @CurrentPrescriptionStatusId IS NULL
        BEGIN
            THROW 50048, 'PRESCRIPTION_NOT_FOUND', 1;
        END

        IF EXISTS (
            SELECT 1 FROM dbo.PrescriptionStatus
            WHERE PrescriptionStatusId = @CurrentPrescriptionStatusId AND Code <> 'DRAFT'
        )
        BEGIN
            THROW 50049, 'PRESCRIPTION_NOT_EDITABLE', 1;
        END

        DECLARE @SourcePrescriptionVersionId INT, @SourceClinicalNotes NVARCHAR(MAX), @SourceXhtml NVARCHAR(MAX);

        SELECT
            @SourcePrescriptionVersionId = PrescriptionVersionId,
            @SourceClinicalNotes = ClinicalNotes,
            @SourceXhtml = Xhtml
        FROM dbo.PrescriptionVersion
        WHERE PrescriptionId = @PrescriptionId AND VersionNumber = @VersionNumber;

        IF @SourcePrescriptionVersionId IS NULL
        BEGIN
            THROW 50051, 'PRESCRIPTION_VERSION_NOT_FOUND', 1;
        END

        DECLARE @PreviousValuesJson NVARCHAR(MAX);
        SELECT @PreviousValuesJson = (
            SELECT PrescriptionId, ClinicalNotes
            FROM dbo.Prescription
            WHERE PrescriptionId = @PrescriptionId
            FOR JSON PATH, WITHOUT_ARRAY_WRAPPER
        );

        BEGIN TRANSACTION;

        UPDATE dbo.Prescription
        SET ClinicalNotes = @SourceClinicalNotes,
            Xhtml = @SourceXhtml,
            UpdatedBy = @RestoredBy,
            UpdatedDate = SYSUTCDATETIME()
        WHERE PrescriptionId = @PrescriptionId;

        DELETE FROM dbo.PrescriptionItem WHERE PrescriptionId = @PrescriptionId;

        INSERT INTO dbo.PrescriptionItem
            (PrescriptionId, PatientMedicationId, MedicineId, MedicineNameSnapshot, GenericNameSnapshot,
             StrengthSnapshot, DosageFormSnapshot, RouteSnapshot, Dose, DoseUnitId, DoseUnitSnapshot,
             FrequencyId, FrequencySnapshot, Duration, DurationUnitId, DurationUnitSnapshot, Quantity,
             Instructions, PRN, ItemStatus, CreatedBy)
        SELECT
            @PrescriptionId, pvi.PatientMedicationId, pvi.MedicineId, pvi.MedicineNameSnapshot, pvi.GenericNameSnapshot,
            pvi.StrengthSnapshot, pvi.DosageFormSnapshot, pvi.RouteSnapshot, pvi.Dose, pvi.DoseUnitId, pvi.DoseUnitSnapshot,
            pvi.FrequencyId, pvi.FrequencySnapshot, pvi.Duration, pvi.DurationUnitId, pvi.DurationUnitSnapshot, pvi.Quantity,
            pvi.Instructions, pvi.PRN, 'ACTIVE', @RestoredBy
        FROM dbo.PrescriptionVersionItem AS pvi
        WHERE pvi.PrescriptionVersionId = @SourcePrescriptionVersionId;

        DECLARE @NewVersionNumber INT;
        SELECT @NewVersionNumber = ISNULL(MAX(VersionNumber), 0) + 1 FROM dbo.PrescriptionVersion WHERE PrescriptionId = @PrescriptionId;

        DECLARE @NewPrescriptionVersionId INT;
        INSERT INTO dbo.PrescriptionVersion
            (PrescriptionId, VersionNumber, ClinicalNotes, Xhtml, PrescriptionStatusId, ChangeSummary, CreatedBy)
        VALUES
            (@PrescriptionId, @NewVersionNumber, @SourceClinicalNotes, @SourceXhtml, @CurrentPrescriptionStatusId,
             'Restored from Version ' + CAST(@VersionNumber AS NVARCHAR(10)), @RestoredBy);

        SET @NewPrescriptionVersionId = SCOPE_IDENTITY();

        INSERT INTO dbo.PrescriptionVersionItem
            (PrescriptionVersionId, PatientMedicationId, MedicineId, MedicineNameSnapshot, GenericNameSnapshot,
             StrengthSnapshot, DosageFormSnapshot, RouteSnapshot, Dose, DoseUnitId, DoseUnitSnapshot,
             FrequencyId, FrequencySnapshot, Duration, DurationUnitId, DurationUnitSnapshot, Quantity,
             Instructions, PRN)
        SELECT
            @NewPrescriptionVersionId, PatientMedicationId, MedicineId, MedicineNameSnapshot, GenericNameSnapshot,
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
        VALUES (
            @PrescriptionId, 'RESTORED', @PreviousValuesJson, @NewValuesJson, @RestoredBy, @NewVersionNumber,
            'RestoredFromVersion' + CAST(@VersionNumber AS NVARCHAR(10))
        );

        COMMIT TRANSACTION;

        SELECT
            p.PrescriptionId,
            p.PrescriptionNumber,
            ps.Code AS StatusCode,
            ps.DisplayText AS StatusDisplayText,
            @NewVersionNumber AS VersionNumber,
            @VersionNumber AS RestoredFromVersionNumber,
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

        THROW;
    END CATCH
END
GO
