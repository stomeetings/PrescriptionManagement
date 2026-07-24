-- Step 18.7: full detail (header + item snapshot) for one specific version. Two result
-- sets in one round trip (Dapper QueryMultiple), same convention already used elsewhere
-- in this module for header+items shaped responses. Used both for the History Dialog's
-- version detail view and as a building block for Compare (the Application layer calls
-- this twice, for @VersionA/@VersionB, and diffs in C# - no separate Compare stored
-- procedure, since comparison is presentation logic, not something SQL should own).
-- Error 50051 PRESCRIPTION_VERSION_NOT_FOUND is new (Prescription Management range
-- extended again: 50041-50051).
CREATE OR ALTER PROCEDURE dbo.usp_PrescriptionVersion_GetByVersion
    @PrescriptionId INT,
    @VersionNumber INT
AS
BEGIN
    SET NOCOUNT ON;

    IF NOT EXISTS (
        SELECT 1 FROM dbo.PrescriptionVersion WHERE PrescriptionId = @PrescriptionId AND VersionNumber = @VersionNumber
    )
    BEGIN
        THROW 50051, 'PRESCRIPTION_VERSION_NOT_FOUND', 1;
    END

    SELECT
        pv.PrescriptionVersionId,
        pv.PrescriptionId,
        pv.VersionNumber,
        pv.ClinicalNotes,
        pv.Xhtml,
        ps.Code AS StatusCode,
        ps.DisplayText AS StatusDisplayText,
        pv.ChangeSummary,
        pv.CreatedDate AS SavedDate,
        pv.CreatedBy AS SavedBy
    FROM dbo.PrescriptionVersion AS pv
    INNER JOIN dbo.PrescriptionStatus AS ps ON ps.PrescriptionStatusId = pv.PrescriptionStatusId
    WHERE pv.PrescriptionId = @PrescriptionId AND pv.VersionNumber = @VersionNumber;

    SELECT
        pvi.PrescriptionVersionItemId,
        pvi.MedicineId,
        pvi.MedicineNameSnapshot,
        pvi.GenericNameSnapshot,
        pvi.StrengthSnapshot,
        pvi.DosageFormSnapshot,
        pvi.RouteSnapshot,
        pvi.Dose,
        pvi.DoseUnitId,
        pvi.DoseUnitSnapshot,
        pvi.FrequencyId,
        pvi.FrequencySnapshot,
        pvi.Duration,
        pvi.DurationUnitId,
        pvi.DurationUnitSnapshot,
        pvi.Quantity,
        pvi.Instructions,
        pvi.PRN
    FROM dbo.PrescriptionVersionItem AS pvi
    INNER JOIN dbo.PrescriptionVersion AS pv ON pv.PrescriptionVersionId = pvi.PrescriptionVersionId
    WHERE pv.PrescriptionId = @PrescriptionId AND pv.VersionNumber = @VersionNumber
    ORDER BY pvi.PrescriptionVersionItemId;
END
GO
