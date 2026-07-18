CREATE OR ALTER PROCEDURE dbo.usp_User_Deactivate
    @UserAccountId INT,
    @UpdatedBy NVARCHAR(100)
AS
BEGIN
    SET NOCOUNT ON;

    -- Business rules (cannot deactivate self, "last Administrator" protection) are
    -- enforced in the Application/Service layer, not here - this procedure only
    -- performs the state change, per the approved database and API specifications.
    BEGIN TRY
        UPDATE dbo.UserAccount
        SET IsActive = 0,
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
