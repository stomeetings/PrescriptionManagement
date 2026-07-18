CREATE OR ALTER PROCEDURE dbo.usp_User_ResetPassword
    @UserAccountId INT,
    @PasswordHash NVARCHAR(256),
    @UpdatedBy NVARCHAR(100)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    -- The temporary password itself is generated and hashed by the Application layer
    -- (per the approved API spec, section 4.7) - this procedure only ever receives and
    -- stores the already-hashed value, matching Authentication's existing pattern.
    BEGIN TRY
        BEGIN TRANSACTION;

        UPDATE dbo.UserAccount
        SET PasswordHash = @PasswordHash,
            MustChangePassword = 1,
            UpdatedBy = @UpdatedBy,
            UpdatedDate = SYSUTCDATETIME()
        WHERE UserAccountId = @UserAccountId
          AND IsDeleted = 0;

        IF @@ROWCOUNT = 0
        BEGIN
            THROW 50004, 'USER_NOT_FOUND', 1;
        END

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF XACT_STATE() <> 0
        BEGIN
            ROLLBACK TRANSACTION;
        END

        THROW;
    END CATCH
END
GO
