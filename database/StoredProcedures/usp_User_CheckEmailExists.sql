CREATE OR ALTER PROCEDURE dbo.usp_User_CheckEmailExists
    @Email NVARCHAR(256),
    @ExcludeUserAccountId INT = NULL
AS
BEGIN
    SET NOCOUNT ON;

    -- Advisory only - see usp_User_CheckUsernameExists for the same caveat. The
    -- authoritative uniqueness check remains the UQ_UserAccount_Email constraint,
    -- enforced at usp_User_Create/usp_User_Update time.
    SELECT CASE WHEN EXISTS (
        SELECT 1
        FROM dbo.UserAccount
        WHERE Email = @Email
          AND IsDeleted = 0
          AND (@ExcludeUserAccountId IS NULL OR UserAccountId <> @ExcludeUserAccountId)
    ) THEN 1 ELSE 0 END AS EmailExists;
END
GO
