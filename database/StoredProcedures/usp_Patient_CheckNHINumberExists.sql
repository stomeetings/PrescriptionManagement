CREATE OR ALTER PROCEDURE dbo.usp_Patient_CheckNHINumberExists
    @NHINumber NVARCHAR(20),
    @ExcludePatientId INT = NULL
AS
BEGIN
    SET NOCOUNT ON;

    -- Advisory only - for live "is this NHI number available?" UI feedback while typing.
    -- The authoritative uniqueness check remains the UQ_Patient_NHINumber constraint,
    -- enforced at usp_Patient_Create/usp_Patient_Update time (see those procedures'
    -- error handling). Using this procedure as a check-then-act guard on its own would
    -- leave a race condition, same caveat as usp_User_CheckUsernameExists.
    SELECT CASE WHEN EXISTS (
        SELECT 1
        FROM dbo.Patient
        WHERE NHINumber = @NHINumber
          AND IsDeleted = 0
          AND (@ExcludePatientId IS NULL OR PatientId <> @ExcludePatientId)
    ) THEN 1 ELSE 0 END AS NHINumberExists;
END
GO
