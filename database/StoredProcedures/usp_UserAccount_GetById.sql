CREATE OR ALTER PROCEDURE dbo.usp_UserAccount_GetById
    @UserAccountId INT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        ua.UserAccountId,
        ua.Username,
        ua.FullName,
        ua.RoleId,
        r.Code AS RoleCode,
        r.DisplayText AS RoleDisplayText,
        ua.IsActive,
        ua.IsDeleted
    FROM dbo.UserAccount AS ua
    INNER JOIN dbo.Role AS r ON r.RoleId = ua.RoleId
    WHERE ua.UserAccountId = @UserAccountId;
END
GO
