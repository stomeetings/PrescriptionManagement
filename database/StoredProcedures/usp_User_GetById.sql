CREATE OR ALTER PROCEDURE dbo.usp_User_GetById
    @UserAccountId INT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        ua.UserAccountId,
        ua.Username,
        ua.FirstName,
        ua.LastName,
        ua.FullName,
        ua.Email,
        ua.PhoneNumber,
        ua.RoleId,
        r.Code AS RoleCode,
        r.DisplayText AS RoleDisplayText,
        ua.IsActive,
        ua.LastLoginDate,
        ua.CreatedDate,
        ua.CreatedBy,
        ua.UpdatedDate,
        ua.UpdatedBy,
        ua.RowVersion
    FROM dbo.UserAccount AS ua
    INNER JOIN dbo.Role AS r ON r.RoleId = ua.RoleId
    WHERE ua.UserAccountId = @UserAccountId
      AND ua.IsDeleted = 0;
END
GO
