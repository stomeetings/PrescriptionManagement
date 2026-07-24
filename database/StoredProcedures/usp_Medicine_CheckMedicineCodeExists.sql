CREATE OR ALTER PROCEDURE dbo.usp_Medicine_CheckMedicineCodeExists
    @MedicineCode NVARCHAR(20),
    @ExcludeMedicineId INT = NULL
AS
BEGIN
    SET NOCOUNT ON;

    -- Advisory only - for live "is this medicine code available?" UI feedback while
    -- typing. The authoritative uniqueness check remains the UQ_Medicine_MedicineCode
    -- constraint, enforced at usp_Medicine_Create time (see that procedure's error
    -- handling). Using this procedure as a check-then-act guard on its own would leave a
    -- race condition, same caveat as usp_User_CheckUsernameExists/
    -- usp_Patient_CheckPatientNumberExists.
    SELECT CASE WHEN EXISTS (
        SELECT 1
        FROM dbo.Medicine
        WHERE MedicineCode = @MedicineCode
          AND IsDeleted = 0
          AND (@ExcludeMedicineId IS NULL OR MedicineId <> @ExcludeMedicineId)
    ) THEN 1 ELSE 0 END AS MedicineCodeExists;
END
GO
