CREATE OR ALTER PROCEDURE dbo.usp_UserAccount_GetByUsername
    @Username NVARCHAR(100)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        ua.UserAccountId,
        ua.Username,
        ua.PasswordHash,
        ua.FullName,
        ua.RoleId,
        r.Code AS RoleCode,
        r.DisplayText AS RoleDisplayText,
        ua.IsActive,
        ua.IsDeleted
    FROM dbo.UserAccount AS ua
    INNER JOIN dbo.Role AS r ON r.RoleId = ua.RoleId
    WHERE ua.Username = @Username;
END
GO
