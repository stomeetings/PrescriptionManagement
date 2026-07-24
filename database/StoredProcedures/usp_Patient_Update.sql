CREATE OR ALTER PROCEDURE dbo.usp_Patient_Update
    @PatientId INT,
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
    @Notes NVARCHAR(MAX) = NULL,
    @RowVersion BINARY(8),
    @UpdatedBy NVARCHAR(100)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    -- PatientNumber is not a parameter here at all - it is immutable (business spec
    -- section 4.5) and there is no column for the caller to change it through.
    -- IsActive is likewise excluded - status changes go only through
    -- usp_Patient_Activate/usp_Patient_Deactivate, per the approved database spec's
    -- stored-procedure purpose table (section 7).
    BEGIN TRY
        BEGIN TRANSACTION;

        UPDATE dbo.Patient
        SET
            FirstName = @FirstName,
            LastName = @LastName,
            PreferredName = @PreferredName,
            DateOfBirth = @DateOfBirth,
            GenderId = @GenderId,
            MobileNumber = @MobileNumber,
            Email = @Email,
            AddressLine1 = @AddressLine1,
            AddressLine2 = @AddressLine2,
            City = @City,
            Region = @Region,
            PostalCode = @PostalCode,
            Country = @Country,
            NHINumber = @NHINumber,
            NZMCNumber = @NZMCNumber,
            Notes = @Notes,
            UpdatedBy = @UpdatedBy,
            UpdatedDate = SYSUTCDATETIME()
        WHERE PatientId = @PatientId
          AND IsDeleted = 0
          AND RowVersion = @RowVersion;

        IF @@ROWCOUNT = 0
        BEGIN
            -- Distinguish "doesn't exist" from "someone else already changed it" so the
            -- Application layer can return 404 vs 409 correctly.
            IF EXISTS (SELECT 1 FROM dbo.Patient WHERE PatientId = @PatientId AND IsDeleted = 0)
            BEGIN
                THROW 50013, 'CONCURRENCY_CONFLICT', 1;
            END
            ELSE
            BEGIN
                THROW 50014, 'PATIENT_NOT_FOUND', 1;
            END
        END

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF XACT_STATE() <> 0
        BEGIN
            ROLLBACK TRANSACTION;
        END

        IF ERROR_NUMBER() IN (2627, 2601) AND ERROR_MESSAGE() LIKE '%UQ_Patient_NHINumber%'
        BEGIN
            THROW 50012, 'DUPLICATE_NHI_NUMBER', 1;
        END

        THROW;
    END CATCH
END
GO
