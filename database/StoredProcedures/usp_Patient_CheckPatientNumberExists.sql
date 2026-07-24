CREATE OR ALTER PROCEDURE dbo.usp_Patient_CheckPatientNumberExists
    @PatientNumber NVARCHAR(20),
    @ExcludePatientId INT = NULL
AS
BEGIN
    SET NOCOUNT ON;

    -- Advisory only, included for parity with usp_User_CheckUsernameExists. In practice
    -- this should rarely if ever be called from the Create flow, since PatientNumber is
    -- never client-supplied (it is generated inside usp_Patient_Create from
    -- Patient_PatientNumberSequence) - the authoritative uniqueness guard remains the
    -- UQ_Patient_PatientNumber constraint, enforced at insert time.
    SELECT CASE WHEN EXISTS (
        SELECT 1
        FROM dbo.Patient
        WHERE PatientNumber = @PatientNumber
          AND IsDeleted = 0
          AND (@ExcludePatientId IS NULL OR PatientId <> @ExcludePatientId)
    ) THEN 1 ELSE 0 END AS PatientNumberExists;
END
GO
