-- Step 18.7: lists every saved version of a Prescription, newest first, for the
-- PrescriptionVersionHistoryDialog/PrescriptionVersionTimeline. Deliberately excludes
-- ClinicalNotes/Xhtml/items - this is the lightweight list view; full content is fetched
-- on demand via usp_PrescriptionVersion_GetByVersion (Track Changes / lazy-load
-- performance requirement).
CREATE OR ALTER PROCEDURE dbo.usp_PrescriptionVersion_GetAll
    @PrescriptionId INT
AS
BEGIN
    SET NOCOUNT ON;

    IF NOT EXISTS (SELECT 1 FROM dbo.Prescription WHERE PrescriptionId = @PrescriptionId AND IsDeleted = 0)
    BEGIN
        THROW 50048, 'PRESCRIPTION_NOT_FOUND', 1;
    END

    SELECT
        pv.PrescriptionVersionId,
        pv.PrescriptionId,
        pv.VersionNumber,
        pv.ChangeSummary,
        ps.Code AS StatusCode,
        ps.DisplayText AS StatusDisplayText,
        pv.CreatedDate AS SavedDate,
        pv.CreatedBy AS SavedBy
    FROM dbo.PrescriptionVersion AS pv
    INNER JOIN dbo.PrescriptionStatus AS ps ON ps.PrescriptionStatusId = pv.PrescriptionStatusId
    WHERE pv.PrescriptionId = @PrescriptionId
    ORDER BY pv.VersionNumber DESC;
END
GO
