CREATE OR ALTER PROCEDURE dbo.usp_Medicine_CheckDuplicateMedicine
    @MedicineName NVARCHAR(200),
    @Strength NVARCHAR(50),
    @MedicineFormId INT,
    @ExcludeMedicineId INT = NULL
AS
BEGIN
    SET NOCOUNT ON;

    -- Advisory only - checks the same (MedicineName, Strength, MedicineFormId) triple
    -- enforced by UQ_Medicine_Name_Strength_Form. The authoritative guard remains that
    -- constraint, enforced at usp_Medicine_Create/usp_Medicine_Update time; this
    -- procedure exists purely for live UI feedback, same caveat as
    -- usp_Medicine_CheckMedicineCodeExists.
    SELECT CASE WHEN EXISTS (
        SELECT 1
        FROM dbo.Medicine
        WHERE MedicineName = @MedicineName
          AND Strength = @Strength
          AND MedicineFormId = @MedicineFormId
          AND IsDeleted = 0
          AND (@ExcludeMedicineId IS NULL OR MedicineId <> @ExcludeMedicineId)
    ) THEN 1 ELSE 0 END AS DuplicateMedicineExists;
END
GO
