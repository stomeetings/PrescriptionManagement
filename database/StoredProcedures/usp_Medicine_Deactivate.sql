CREATE OR ALTER PROCEDURE dbo.usp_Medicine_Deactivate
    @MedicineId INT,
    @UpdatedBy NVARCHAR(100)
AS
BEGIN
    SET NOCOUNT ON;

    -- Business rules (e.g. preventing selection for new prescriptions) are enforced in
    -- the Application/Service layer and by the future Prescription module - this
    -- procedure only performs the state change, matching usp_Patient_Deactivate's
    -- precedent. No check for existing prescription references is performed here: no
    -- Prescription/PrescriptionItem table exists yet, and deactivation never deletes
    -- the row, so no historical reference could be broken by this statement anyway.
    BEGIN TRY
        UPDATE dbo.Medicine
        SET IsActive = 0,
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
