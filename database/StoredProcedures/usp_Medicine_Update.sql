CREATE OR ALTER PROCEDURE dbo.usp_Medicine_Update
    @MedicineId INT,
    @MedicineName NVARCHAR(200),
    @GenericName NVARCHAR(200),
    @BrandName NVARCHAR(200) = NULL,
    @Strength NVARCHAR(50),
    @MedicineFormId INT,
    @MedicineRouteId INT,
    @Manufacturer NVARCHAR(200) = NULL,
    @ATCCode NVARCHAR(20) = NULL,
    @IsControlledDrug BIT,
    @Notes NVARCHAR(MAX) = NULL,
    @RowVersion BINARY(8),
    @UpdatedBy NVARCHAR(100)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    -- MedicineCode is not a parameter here at all - it is immutable (business spec
    -- section 5.5) and there is no column for the caller to change it through.
    -- IsActive is likewise excluded - status changes go only through
    -- usp_Medicine_Activate/usp_Medicine_Deactivate.
    BEGIN TRY
        BEGIN TRANSACTION;

        UPDATE dbo.Medicine
        SET
            MedicineName = @MedicineName,
            GenericName = @GenericName,
            BrandName = @BrandName,
            Strength = @Strength,
            MedicineFormId = @MedicineFormId,
            MedicineRouteId = @MedicineRouteId,
            Manufacturer = @Manufacturer,
            ATCCode = @ATCCode,
            IsControlledDrug = @IsControlledDrug,
            Notes = @Notes,
            UpdatedBy = @UpdatedBy,
            UpdatedDate = SYSUTCDATETIME()
        WHERE MedicineId = @MedicineId
          AND IsDeleted = 0
          AND RowVersion = @RowVersion;

        IF @@ROWCOUNT = 0
        BEGIN
            -- Distinguish "doesn't exist" from "someone else already changed it" so the
            -- Application layer can return 404 vs 409 correctly.
            IF EXISTS (SELECT 1 FROM dbo.Medicine WHERE MedicineId = @MedicineId AND IsDeleted = 0)
            BEGIN
                THROW 50023, 'MEDICINE_CONCURRENCY_CONFLICT', 1;
            END
            ELSE
            BEGIN
                THROW 50024, 'MEDICINE_NOT_FOUND', 1;
            END
        END

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF XACT_STATE() <> 0
        BEGIN
            ROLLBACK TRANSACTION;
        END

        IF ERROR_NUMBER() IN (2627, 2601) AND ERROR_MESSAGE() LIKE '%UQ_Medicine_Name_Strength_Form%'
        BEGIN
            THROW 50022, 'DUPLICATE_MEDICINE', 1;
        END

        THROW;
    END CATCH
END
GO
