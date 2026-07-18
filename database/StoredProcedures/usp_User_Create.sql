CREATE OR ALTER PROCEDURE dbo.usp_User_Create
    @FirstName NVARCHAR(100),
    @LastName NVARCHAR(100),
    @Username NVARCHAR(100),
    @Email NVARCHAR(256),
    @PhoneNumber NVARCHAR(20) = NULL,
    @RoleId INT,
    @PasswordHash NVARCHAR(256),
    @IsActive BIT = 1,
    @MustChangePassword BIT = 1,
    @CreatedBy NVARCHAR(100),
    @UserAccountId INT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRY
        DECLARE @FullName NVARCHAR(200) = @FirstName + N' ' + @LastName;

        BEGIN TRANSACTION;

        INSERT INTO dbo.UserAccount
            (Username, PasswordHash, FullName, FirstName, LastName, Email, PhoneNumber,
             RoleId, IsActive, MustChangePassword, CreatedBy)
        VALUES
            (@Username, @PasswordHash, @FullName, @FirstName, @LastName, @Email, @PhoneNumber,
             @RoleId, @IsActive, @MustChangePassword, @CreatedBy);

        SET @UserAccountId = SCOPE_IDENTITY();

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF XACT_STATE() <> 0
        BEGIN
            ROLLBACK TRANSACTION;
        END

        -- Re-throw unique-constraint violations as specific, identifiable errors so the
        -- Application layer can distinguish "duplicate username" from "duplicate email"
        -- without parsing SQL Server's raw constraint-violation message text.
        IF ERROR_NUMBER() IN (2627, 2601)
        BEGIN
            IF ERROR_MESSAGE() LIKE '%UQ_UserAccount_Username%'
            BEGIN
                THROW 50001, 'DUPLICATE_USERNAME', 1;
            END

            IF ERROR_MESSAGE() LIKE '%UQ_UserAccount_Email%'
            BEGIN
                THROW 50002, 'DUPLICATE_EMAIL', 1;
            END
        END

        THROW;
    END CATCH
END
GO
