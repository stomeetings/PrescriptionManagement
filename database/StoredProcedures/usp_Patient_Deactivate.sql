CREATE OR ALTER PROCEDURE dbo.usp_Patient_Deactivate
    @PatientId INT,
    @UpdatedBy NVARCHAR(100)
AS
BEGIN
    SET NOCOUNT ON;

    -- Business rules (e.g. any future restriction on which roles may deactivate a
    -- patient - see database-spec.md section 10 item 5) are enforced in the
    -- Application/Service layer, not here - this procedure only performs the state
    -- change, matching usp_User_Deactivate's precedent.
    BEGIN TRY
        UPDATE dbo.Patient
        SET IsActive = 0,
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
