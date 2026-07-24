CREATE OR ALTER PROCEDURE dbo.usp_Medicine_Activate
    @MedicineId INT,
    @UpdatedBy NVARCHAR(100)
AS
BEGIN
    SET NOCOUNT ON;

    BEGIN TRY
        UPDATE dbo.Medicine
        SET IsActive = 1,
            UpdatedBy = @UpdatedBy,
            UpdatedDate = SYSUTCDATETIME()
        WHERE MedicineId = @MedicineId
          AND IsDeleted = 0;

        IF @@ROWCOUNT = 0
        BEGIN
            THROW 50024, 'MEDICINE_NOT_FOUND', 1;
        END
    END TRY
    BEGIN CATCH
        THROW;
    END CATCH
END
GO
