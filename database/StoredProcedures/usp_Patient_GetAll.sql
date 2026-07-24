CREATE OR ALTER PROCEDURE dbo.usp_Patient_GetAll
    @Page INT,
    @PageSize INT,
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
    WHERE p.IsDeleted = 0;
END
GO
