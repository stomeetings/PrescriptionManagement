CREATE OR ALTER PROCEDURE dbo.usp_User_Activate
    @UserAccountId INT,
    @UpdatedBy NVARCHAR(100)
AS
BEGIN
    SET NOCOUNT ON;

    BEGIN TRY
        UPDATE dbo.UserAccount
        SET IsActive = 1,
            UpdatedBy = @UpdatedBy,
            UpdatedDate = SYSUTCDATETIME()
        WHERE UserAccountId = @UserAccountId
          AND IsDeleted = 0;

        IF @@ROWCOUNT = 0
        BEGIN
            THROW 50004, 'USER_NOT_FOUND', 1;
        END
    END TRY
    BEGIN CATCH
        THROW;
    END CATCH
END
GO
