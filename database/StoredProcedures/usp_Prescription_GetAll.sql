-- Prescription Management List (no search/filter applied) - mirrors usp_Patient_GetAll's
-- identical "plain paged list vs. filtered Search" split. MedicationCount/VersionNumber
-- are computed per row (COUNT of PrescriptionItem, MAX of PrescriptionVersion.
-- VersionNumber) rather than stored columns - both are already derivable, and storing
-- either would just be a duplicate that could drift, same reasoning already applied to
-- PDF DownloadCount (045_AlterPrescriptionAudit_AddPdfGeneratedAction.sql).
CREATE OR ALTER PROCEDURE dbo.usp_Prescription_GetAll
    @Page INT,
    @PageSize INT,
    @SortBy NVARCHAR(50) = N'createdDate',
    @SortDirection NVARCHAR(4) = N'DESC'
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @Offset INT = (@Page - 1) * @PageSize;

    SELECT
        p.PrescriptionId,
        p.PrescriptionNumber,
        p.PatientId,
        pt.FirstName + N' ' + pt.LastName AS PatientName,
        pt.NHINumber,
        p.ProviderUserAccountId,
        ua.FullName AS ProviderName,
        p.IssueDate,
        p.ExpiryDate,
        (SELECT COUNT(*) FROM dbo.PrescriptionItem AS pi WHERE pi.PrescriptionId = p.PrescriptionId) AS MedicationCount,
        ps.Code AS StatusCode,
        ps.DisplayText AS StatusDisplayText,
        (SELECT MAX(pv.VersionNumber) FROM dbo.PrescriptionVersion AS pv WHERE pv.PrescriptionId = p.PrescriptionId) AS VersionNumber,
        p.CreatedBy,
        p.CreatedDate
    FROM dbo.Prescription AS p
    INNER JOIN dbo.Patient AS pt ON pt.PatientId = p.PatientId
    INNER JOIN dbo.UserAccount AS ua ON ua.UserAccountId = p.ProviderUserAccountId
    INNER JOIN dbo.PrescriptionStatus AS ps ON ps.PrescriptionStatusId = p.PrescriptionStatusId
    WHERE p.IsDeleted = 0
    ORDER BY
        CASE WHEN @SortDirection = N'ASC' AND @SortBy = N'prescriptionNumber' THEN p.PrescriptionNumber END ASC,
        CASE WHEN @SortDirection = N'ASC' AND @SortBy = N'patient' THEN pt.FirstName + N' ' + pt.LastName END ASC,
        CASE WHEN @SortDirection = N'ASC' AND @SortBy = N'issueDate' THEN p.IssueDate END ASC,
        CASE WHEN @SortDirection = N'ASC' AND @SortBy = N'expiryDate' THEN p.ExpiryDate END ASC,
        CASE WHEN @SortDirection = N'ASC' AND @SortBy = N'status' THEN ps.DisplayText END ASC,
        CASE WHEN @SortDirection = N'ASC' AND @SortBy = N'createdDate' THEN p.CreatedDate END ASC,
        CASE WHEN @SortDirection = N'DESC' AND @SortBy = N'prescriptionNumber' THEN p.PrescriptionNumber END DESC,
        CASE WHEN @SortDirection = N'DESC' AND @SortBy = N'patient' THEN pt.FirstName + N' ' + pt.LastName END DESC,
        CASE WHEN @SortDirection = N'DESC' AND @SortBy = N'issueDate' THEN p.IssueDate END DESC,
        CASE WHEN @SortDirection = N'DESC' AND @SortBy = N'expiryDate' THEN p.ExpiryDate END DESC,
        CASE WHEN @SortDirection = N'DESC' AND @SortBy = N'status' THEN ps.DisplayText END DESC,
        CASE WHEN @SortDirection = N'DESC' AND @SortBy = N'createdDate' THEN p.CreatedDate END DESC,
        p.CreatedDate DESC
    OFFSET @Offset ROWS FETCH NEXT @PageSize ROWS ONLY;

    SELECT COUNT(*) AS TotalCount
    FROM dbo.Prescription AS p
    WHERE p.IsDeleted = 0;
END
GO
