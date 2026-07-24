-- Prescription Management List search/filter - mirrors usp_Patient_Search's identical
-- shape (SearchTerm OR'd across fields, structured filters AND'd, same CASE-based
-- sortable-column pattern, same two-result-set page+count convention). SearchTerm covers
-- Prescription Number/Patient Name/NHI/Provider Name directly, plus Medicine Name via an
-- EXISTS against PrescriptionItem (a plain join would duplicate one row per item).
CREATE OR ALTER PROCEDURE dbo.usp_Prescription_Search
    @Page INT,
    @PageSize INT,
    @SearchTerm NVARCHAR(256) = NULL,
    @StatusCode NVARCHAR(50) = NULL,
    @IssueDateFrom DATE = NULL,
    @IssueDateTo DATE = NULL,
    @ExpiryDateFrom DATE = NULL,
    @ExpiryDateTo DATE = NULL,
    @PatientId INT = NULL,
    @ProviderUserAccountId INT = NULL,
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
      AND (@SearchTerm IS NULL
           OR p.PrescriptionNumber LIKE N'%' + @SearchTerm + N'%'
           OR pt.FirstName LIKE N'%' + @SearchTerm + N'%'
           OR pt.LastName LIKE N'%' + @SearchTerm + N'%'
           OR (pt.FirstName + N' ' + pt.LastName) LIKE N'%' + @SearchTerm + N'%'
           OR pt.NHINumber LIKE N'%' + @SearchTerm + N'%'
           OR ua.FullName LIKE N'%' + @SearchTerm + N'%'
           OR EXISTS (
               SELECT 1 FROM dbo.PrescriptionItem AS pi2
               WHERE pi2.PrescriptionId = p.PrescriptionId AND pi2.MedicineNameSnapshot LIKE N'%' + @SearchTerm + N'%'
           ))
      AND (@StatusCode IS NULL OR ps.Code = @StatusCode)
      AND (@IssueDateFrom IS NULL OR p.IssueDate >= @IssueDateFrom)
      AND (@IssueDateTo IS NULL OR p.IssueDate <= @IssueDateTo)
      AND (@ExpiryDateFrom IS NULL OR p.ExpiryDate >= @ExpiryDateFrom)
      AND (@ExpiryDateTo IS NULL OR p.ExpiryDate <= @ExpiryDateTo)
      AND (@PatientId IS NULL OR p.PatientId = @PatientId)
      AND (@ProviderUserAccountId IS NULL OR p.ProviderUserAccountId = @ProviderUserAccountId)
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
    INNER JOIN dbo.Patient AS pt ON pt.PatientId = p.PatientId
    INNER JOIN dbo.UserAccount AS ua ON ua.UserAccountId = p.ProviderUserAccountId
    INNER JOIN dbo.PrescriptionStatus AS ps ON ps.PrescriptionStatusId = p.PrescriptionStatusId
    WHERE p.IsDeleted = 0
      AND (@SearchTerm IS NULL
           OR p.PrescriptionNumber LIKE N'%' + @SearchTerm + N'%'
           OR pt.FirstName LIKE N'%' + @SearchTerm + N'%'
           OR pt.LastName LIKE N'%' + @SearchTerm + N'%'
           OR (pt.FirstName + N' ' + pt.LastName) LIKE N'%' + @SearchTerm + N'%'
           OR pt.NHINumber LIKE N'%' + @SearchTerm + N'%'
           OR ua.FullName LIKE N'%' + @SearchTerm + N'%'
           OR EXISTS (
               SELECT 1 FROM dbo.PrescriptionItem AS pi2
               WHERE pi2.PrescriptionId = p.PrescriptionId AND pi2.MedicineNameSnapshot LIKE N'%' + @SearchTerm + N'%'
           ))
      AND (@StatusCode IS NULL OR ps.Code = @StatusCode)
      AND (@IssueDateFrom IS NULL OR p.IssueDate >= @IssueDateFrom)
      AND (@IssueDateTo IS NULL OR p.IssueDate <= @IssueDateTo)
      AND (@ExpiryDateFrom IS NULL OR p.ExpiryDate >= @ExpiryDateFrom)
      AND (@ExpiryDateTo IS NULL OR p.ExpiryDate <= @ExpiryDateTo)
      AND (@PatientId IS NULL OR p.PatientId = @PatientId)
      AND (@ProviderUserAccountId IS NULL OR p.ProviderUserAccountId = @ProviderUserAccountId);
END
GO
