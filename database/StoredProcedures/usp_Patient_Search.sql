-- Nhi/FirstName/LastName/DateOfBirth (added for the Prescription module's Patient
-- Search/Selection dialog - "New Prescription" must only ever pick an existing patient)
-- are discrete, independently-suppliable filters, AND-combined with each other and with
-- @SearchTerm/@Status/@GenderCode when supplied - they do not change @SearchTerm's own
-- existing OR-across-many-columns behavior used by the Patient Management List page.
CREATE OR ALTER PROCEDURE dbo.usp_Patient_Search
    @Page INT,
    @PageSize INT,
    @SearchTerm NVARCHAR(256) = NULL,
    @Status NVARCHAR(10) = NULL,
    @GenderCode NVARCHAR(50) = NULL,
    @Nhi NVARCHAR(20) = NULL,
    @FirstName NVARCHAR(100) = NULL,
    @LastName NVARCHAR(100) = NULL,
    @DateOfBirth DATE = NULL,
    @SortBy NVARCHAR(50) = N'createdDate',
    @SortDirection NVARCHAR(4) = N'DESC'
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @Offset INT = (@Page - 1) * @PageSize;

    SELECT
        p.PatientId,
        p.PatientNumber,
        p.FirstName,
        p.LastName,
        p.FirstName + N' ' + p.LastName AS FullName,
        p.DateOfBirth,
        p.GenderId,
        g.Code AS GenderCode,
        g.DisplayText AS GenderDisplayText,
        p.MobileNumber,
        p.Email,
        p.NHINumber,
        p.IsActive,
        p.CreatedDate,
        p.UpdatedDate
    FROM dbo.Patient AS p
    INNER JOIN dbo.Gender AS g ON g.GenderId = p.GenderId
    WHERE p.IsDeleted = 0
      AND (@SearchTerm IS NULL
           OR p.PatientNumber LIKE N'%' + @SearchTerm + N'%'
           OR p.FirstName LIKE N'%' + @SearchTerm + N'%'
           OR p.LastName LIKE N'%' + @SearchTerm + N'%'
           OR (p.FirstName + N' ' + p.LastName) LIKE N'%' + @SearchTerm + N'%'
           OR p.MobileNumber LIKE N'%' + @SearchTerm + N'%'
           OR p.Email LIKE N'%' + @SearchTerm + N'%'
           OR p.NHINumber LIKE N'%' + @SearchTerm + N'%')
      AND (@Status IS NULL
           OR (@Status = N'Active' AND p.IsActive = 1)
           OR (@Status = N'Inactive' AND p.IsActive = 0))
      AND (@GenderCode IS NULL OR g.Code = @GenderCode)
      AND (@Nhi IS NULL OR p.NHINumber LIKE N'%' + @Nhi + N'%')
      AND (@FirstName IS NULL OR p.FirstName LIKE N'%' + @FirstName + N'%')
      AND (@LastName IS NULL OR p.LastName LIKE N'%' + @LastName + N'%')
      AND (@DateOfBirth IS NULL OR p.DateOfBirth = @DateOfBirth)
    ORDER BY
        CASE WHEN @SortDirection = N'ASC' AND @SortBy = N'patientNumber' THEN p.PatientNumber END ASC,
        CASE WHEN @SortDirection = N'ASC' AND @SortBy = N'firstName' THEN p.FirstName END ASC,
        CASE WHEN @SortDirection = N'ASC' AND @SortBy = N'lastName' THEN p.LastName END ASC,
        CASE WHEN @SortDirection = N'ASC' AND @SortBy = N'fullName' THEN p.FirstName + N' ' + p.LastName END ASC,
        CASE WHEN @SortDirection = N'ASC' AND @SortBy = N'dateOfBirth' THEN p.DateOfBirth END ASC,
        CASE WHEN @SortDirection = N'ASC' AND @SortBy = N'createdDate' THEN p.CreatedDate END ASC,
        CASE WHEN @SortDirection = N'ASC' AND @SortBy = N'updatedDate' THEN p.UpdatedDate END ASC,
        CASE WHEN @SortDirection = N'DESC' AND @SortBy = N'patientNumber' THEN p.PatientNumber END DESC,
        CASE WHEN @SortDirection = N'DESC' AND @SortBy = N'firstName' THEN p.FirstName END DESC,
        CASE WHEN @SortDirection = N'DESC' AND @SortBy = N'lastName' THEN p.LastName END DESC,
        CASE WHEN @SortDirection = N'DESC' AND @SortBy = N'fullName' THEN p.FirstName + N' ' + p.LastName END DESC,
        CASE WHEN @SortDirection = N'DESC' AND @SortBy = N'dateOfBirth' THEN p.DateOfBirth END DESC,
        CASE WHEN @SortDirection = N'DESC' AND @SortBy = N'createdDate' THEN p.CreatedDate END DESC,
        CASE WHEN @SortDirection = N'DESC' AND @SortBy = N'updatedDate' THEN p.UpdatedDate END DESC,
        p.CreatedDate DESC
    OFFSET @Offset ROWS FETCH NEXT @PageSize ROWS ONLY;

    SELECT COUNT(*) AS TotalCount
    FROM dbo.Patient AS p
    INNER JOIN dbo.Gender AS g ON g.GenderId = p.GenderId
    WHERE p.IsDeleted = 0
      AND (@SearchTerm IS NULL
           OR p.PatientNumber LIKE N'%' + @SearchTerm + N'%'
           OR p.FirstName LIKE N'%' + @SearchTerm + N'%'
           OR p.LastName LIKE N'%' + @SearchTerm + N'%'
           OR (p.FirstName + N' ' + p.LastName) LIKE N'%' + @SearchTerm + N'%'
           OR p.MobileNumber LIKE N'%' + @SearchTerm + N'%'
           OR p.Email LIKE N'%' + @SearchTerm + N'%'
           OR p.NHINumber LIKE N'%' + @SearchTerm + N'%')
      AND (@Status IS NULL
           OR (@Status = N'Active' AND p.IsActive = 1)
           OR (@Status = N'Inactive' AND p.IsActive = 0))
      AND (@GenderCode IS NULL OR g.Code = @GenderCode)
      AND (@Nhi IS NULL OR p.NHINumber LIKE N'%' + @Nhi + N'%')
      AND (@FirstName IS NULL OR p.FirstName LIKE N'%' + @FirstName + N'%')
      AND (@LastName IS NULL OR p.LastName LIKE N'%' + @LastName + N'%')
      AND (@DateOfBirth IS NULL OR p.DateOfBirth = @DateOfBirth);
END
GO
