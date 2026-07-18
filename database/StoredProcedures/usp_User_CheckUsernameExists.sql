CREATE OR ALTER PROCEDURE dbo.usp_User_CheckUsernameExists
    @Username NVARCHAR(100),
    @ExcludeUserAccountId INT = NULL
AS
BEGIN
    SET NOCOUNT ON;

    -- Advisory only - for live "is this username available?" UI feedback while typing.
    -- The authoritative uniqueness check remains the UQ_UserAccount_Username constraint,
    -- enforced at usp_User_Create time (see that procedure's error handling). This
    -- procedure exists for UX responsiveness, not as a replacement safety mechanism -
    -- using it as a check-then-act guard on its own would leave a race condition.
    SELECT CASE WHEN EXISTS (
        SELECT 1
        FROM dbo.UserAccount
        WHERE Username = @Username
          AND IsDeleted = 0
          AND (@ExcludeUserAccountId IS NULL OR UserAccountId <> @ExcludeUserAccountId)
    ) THEN 1 ELSE 0 END AS UsernameExists;
END
GO
