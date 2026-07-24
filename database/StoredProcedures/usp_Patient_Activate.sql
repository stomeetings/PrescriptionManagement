CREATE OR ALTER PROCEDURE dbo.usp_Patient_Activate
    @PatientId INT,
    @UpdatedBy NVARCHAR(100)
AS
BEGIN
    SET NOCOUNT ON;

    BEGIN TRY
        UPDATE dbo.Patient
        SET IsActive = 1,
            UpdatedBy = @UpdatedBy,
            UpdatedDate = SYSUTCDATETIME()
        WHERE PatientId = @PatientId
          AND IsDeleted = 0;

        IF @@ROWCOUNT = 0
        BEGIN
            THROW 50014, 'PATIENT_NOT_FOUND', 1;
        END
    END TRY
    BEGIN CATCH
        THROW;
    END CATCH
END
GO
