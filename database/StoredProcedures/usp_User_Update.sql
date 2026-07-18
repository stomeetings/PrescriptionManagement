CREATE OR ALTER PROCEDURE dbo.usp_User_Update
    @UserAccountId INT,
    @FirstName NVARCHAR(100),
    @LastName NVARCHAR(100),
    @Email NVARCHAR(256),
    @PhoneNumber NVARCHAR(20) = NULL,
    @RoleId INT,
    @IsActive BIT,
    @RowVersion BINARY(8),
    @UpdatedBy NVARCHAR(100)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRY
        BEGIN TRANSACTION;

        UPDATE dbo.UserAccount
        SET
            FirstName = @FirstName,
            LastName = @LastName,
            FullName = @FirstName + N' ' + @LastName,
            Email = @Email,
            PhoneNumber = @PhoneNumber,
            RoleId = @RoleId,
            IsActive = @IsActive,
            UpdatedBy = @UpdatedBy,
            UpdatedDate = SYSUTCDATETIME()
        WHERE UserAccountId = @UserAccountId
          AND IsDeleted = 0
          AND RowVersion = @RowVersion;

        IF @@ROWCOUNT = 0
        BEGIN
            -- Distinguish "doesn't exist" from "someone else already changed it" so the
            -- Application layer can return 404 vs 409 correctly.
            IF EXISTS (SELECT 1 FROM dbo.UserAccount WHERE UserAccountId = @UserAccountId AND IsDeleted = 0)
            BEGIN
                THROW 50003, 'CONCURRENCY_CONFLICT', 1;
            END
            ELSE
            BEGIN
                THROW 50004, 'USER_NOT_FOUND', 1;
            END
        END

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF XACT_STATE() <> 0
        BEGIN
            ROLLBACK TRANSACTION;
        END

        IF ERROR_NUMBER() IN (2627, 2601) AND ERROR_MESSAGE() LIKE '%UQ_UserAccount_Email%'
        BEGIN
            THROW 50002, 'DUPLICATE_EMAIL', 1;
        END

        THROW;
    END CATCH
END
GO
