CREATE OR ALTER PROCEDURE dbo.usp_Patient_Create
    @FirstName NVARCHAR(100),
    @LastName NVARCHAR(100),
    @PreferredName NVARCHAR(100) = NULL,
    @DateOfBirth DATE,
    @GenderId INT,
    @MobileNumber NVARCHAR(20) = NULL,
    @Email NVARCHAR(256) = NULL,
    @AddressLine1 NVARCHAR(200) = NULL,
    @AddressLine2 NVARCHAR(200) = NULL,
    @City NVARCHAR(100) = NULL,
    @Region NVARCHAR(100) = NULL,
    @PostalCode NVARCHAR(20) = NULL,
    @Country NVARCHAR(100) = NULL,
    @NHINumber NVARCHAR(20) = NULL,
    @NZMCNumber NVARCHAR(20) = NULL,
    @IsActive BIT = 1,
    @Notes NVARCHAR(MAX) = NULL,
    @CreatedBy NVARCHAR(100),
    @PatientId INT OUTPUT,
    @PatientNumber NVARCHAR(20) OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRY
        -- PatientNumber is never accepted as an input - it is generated here from the
        -- Patient_PatientNumberSequence object (database-spec.md section 3.3), the same
        -- way Step 3's seed data generates it, guaranteeing one continuous, collision-free
        -- number range shared by seeded and application-created patients.
        SET @PatientNumber = N'PT-' + RIGHT(N'000000' + CAST(NEXT VALUE FOR dbo.Patient_PatientNumberSequence AS VARCHAR(6)), 6);

        BEGIN TRANSACTION;

        INSERT INTO dbo.Patient
            (PatientNumber, FirstName, LastName, PreferredName, DateOfBirth, GenderId,
             MobileNumber, Email, AddressLine1, AddressLine2, City, Region, PostalCode,
             Country, NHINumber, NZMCNumber, IsActive, Notes, CreatedBy)
        VALUES
            (@PatientNumber, @FirstName, @LastName, @PreferredName, @DateOfBirth, @GenderId,
             @MobileNumber, @Email, @AddressLine1, @AddressLine2, @City, @Region, @PostalCode,
             @Country, @NHINumber, @NZMCNumber, @IsActive, @Notes, @CreatedBy);

        SET @PatientId = SCOPE_IDENTITY();

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF XACT_STATE() <> 0
        BEGIN
            ROLLBACK TRANSACTION;
        END

        -- Re-throw unique-constraint violations as specific, identifiable errors so the
        -- Application layer can distinguish "duplicate NHI number" from a (theoretically
        -- unreachable, since PatientNumber is server-generated) patient number collision,
        -- without parsing SQL Server's raw constraint-violation message text.
        IF ERROR_NUMBER() IN (2627, 2601)
        BEGIN
            IF ERROR_MESSAGE() LIKE '%UQ_Patient_NHINumber%'
            BEGIN
                THROW 50012, 'DUPLICATE_NHI_NUMBER', 1;
            END

            IF ERROR_MESSAGE() LIKE '%UQ_Patient_PatientNumber%'
            BEGIN
                THROW 50011, 'DUPLICATE_PATIENT_NUMBER', 1;
            END
        END

        THROW;
    END CATCH
END
GO
