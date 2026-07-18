CREATE OR ALTER PROCEDURE dbo.usp_User_Search
    @Page INT,
    @PageSize INT,
    @SearchTerm NVARCHAR(256) = NULL,
    @RoleCode NVARCHAR(50) = NULL,
    @Status NVARCHAR(10) = NULL,
    @SortBy NVARCHAR(50) = N'createdDate',
    @SortDirection NVARCHAR(4) = N'DESC'
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @Offset INT = (@Page - 1) * @PageSize;

    SELECT
        ua.UserAccountId,
        ua.Username,
        ua.FullName,
        ua.Email,
        ua.PhoneNumber,
        ua.RoleId,
        r.Code AS RoleCode,
        r.DisplayText AS RoleDisplayText,
        ua.IsActive,
        ua.LastLoginDate,
        ua.CreatedDate
    FROM dbo.UserAccount AS ua
    INNER JOIN dbo.Role AS r ON r.RoleId = ua.RoleId
    WHERE ua.IsDeleted = 0
      AND (@SearchTerm IS NULL
           OR ua.Username LIKE N'%' + @SearchTerm + N'%'
           OR ua.FirstName LIKE N'%' + @SearchTerm + N'%'
           OR ua.LastName LIKE N'%' + @SearchTerm + N'%'
           OR ua.Email LIKE N'%' + @SearchTerm + N'%')
      AND (@RoleCode IS NULL OR r.Code = @RoleCode)
      AND (@Status IS NULL
           OR (@Status = N'Active' AND ua.IsActive = 1)
           OR (@Status = N'Inactive' AND ua.IsActive = 0))
    ORDER BY
        CASE WHEN @SortDirection = N'ASC' AND @SortBy = N'username' THEN ua.Username END ASC,
        CASE WHEN @SortDirection = N'ASC' AND @SortBy = N'fullName' THEN ua.FullName END ASC,
        CASE WHEN @SortDirection = N'ASC' AND @SortBy = N'email' THEN ua.Email END ASC,
        CASE WHEN @SortDirection = N'ASC' AND @SortBy = N'role' THEN r.DisplayText END ASC,
        CASE WHEN @SortDirection = N'ASC' AND @SortBy = N'status' THEN ua.IsActive END ASC,
        CASE WHEN @SortDirection = N'ASC' AND @SortBy = N'lastLoginDate' THEN ua.LastLoginDate END ASC,
        CASE WHEN @SortDirection = N'ASC' AND @SortBy = N'createdDate' THEN ua.CreatedDate END ASC,
        CASE WHEN @SortDirection = N'DESC' AND @SortBy = N'username' THEN ua.Username END DESC,
        CASE WHEN @SortDirection = N'DESC' AND @SortBy = N'fullName' THEN ua.FullName END DESC,
        CASE WHEN @SortDirection = N'DESC' AND @SortBy = N'email' THEN ua.Email END DESC,
        CASE WHEN @SortDirection = N'DESC' AND @SortBy = N'role' THEN r.DisplayText END DESC,
        CASE WHEN @SortDirection = N'DESC' AND @SortBy = N'status' THEN ua.IsActive END DESC,
        CASE WHEN @SortDirection = N'DESC' AND @SortBy = N'lastLoginDate' THEN ua.LastLoginDate END DESC,
        CASE WHEN @SortDirection = N'DESC' AND @SortBy = N'createdDate' THEN ua.CreatedDate END DESC,
        ua.CreatedDate DESC
    OFFSET @Offset ROWS FETCH NEXT @PageSize ROWS ONLY;

    SELECT COUNT(*) AS TotalCount
    FROM dbo.UserAccount AS ua
    INNER JOIN dbo.Role AS r ON r.RoleId = ua.RoleId
    WHERE ua.IsDeleted = 0
      AND (@SearchTerm IS NULL
           OR ua.Username LIKE N'%' + @SearchTerm + N'%'
           OR ua.FirstName LIKE N'%' + @SearchTerm + N'%'
           OR ua.LastName LIKE N'%' + @SearchTerm + N'%'
           OR ua.Email LIKE N'%' + @SearchTerm + N'%')
      AND (@RoleCode IS NULL OR r.Code = @RoleCode)
      AND (@Status IS NULL
           OR (@Status = N'Active' AND ua.IsActive = 1)
           OR (@Status = N'Inactive' AND ua.IsActive = 0));
END
GO
