CREATE OR ALTER PROCEDURE dbo.usp_Medicine_Create
    @MedicineCode NVARCHAR(20),
    @MedicineName NVARCHAR(200),
    @GenericName NVARCHAR(200),
    @BrandName NVARCHAR(200) = NULL,
    @Strength NVARCHAR(50),
    @MedicineFormId INT,
    @MedicineRouteId INT,
    @Manufacturer NVARCHAR(200) = NULL,
    @ATCCode NVARCHAR(20) = NULL,
    @IsControlledDrug BIT = 0,
    @Notes NVARCHAR(MAX) = NULL,
    @CreatedBy NVARCHAR(100),
    @MedicineId INT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    -- Unlike Patient.PatientNumber, MedicineCode is client-supplied (approved API spec
    -- section 1) - there is no server-side generation step here, only the uniqueness
    -- guard provided by UQ_Medicine_MedicineCode, enforced via the CATCH block below.
    BEGIN TRY
        BEGIN TRANSACTION;

        INSERT INTO dbo.Medicine
            (MedicineCode, MedicineName, GenericName, BrandName, Strength, MedicineFormId,
             MedicineRouteId, Manufacturer, ATCCode, IsControlledDrug, Notes, CreatedBy)
        VALUES
            (@MedicineCode, @MedicineName, @GenericName, @BrandName, @Strength, @MedicineFormId,
             @MedicineRouteId, @Manufacturer, @ATCCode, @IsControlledDrug, @Notes, @CreatedBy);

        SET @MedicineId = SCOPE_IDENTITY();

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF XACT_STATE() <> 0
        BEGIN
            ROLLBACK TRANSACTION;
        END

        -- Re-throw unique-constraint/check-constraint violations as specific,
        -- identifiable errors so the Application layer can distinguish them without
        -- parsing SQL Server's raw constraint-violation message text.
        IF ERROR_NUMBER() IN (2627, 2601)
        BEGIN
            IF ERROR_MESSAGE() LIKE '%UQ_Medicine_MedicineCode%'
            BEGIN
                THROW 50021, 'DUPLICATE_MEDICINE_CODE', 1;
            END

            IF ERROR_MESSAGE() LIKE '%UQ_Medicine_Name_Strength_Form%'
            BEGIN
                THROW 50022, 'DUPLICATE_MEDICINE', 1;
            END
        END

        THROW;
    END CATCH
END
GO
