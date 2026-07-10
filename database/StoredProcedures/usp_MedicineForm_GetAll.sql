CREATE OR ALTER PROCEDURE dbo.usp_MedicineForm_GetAll
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        MedicineFormId,
        Code,
        DisplayText,
        DisplayOrder,
        IsActive,
        CreatedDate,
        CreatedBy,
        UpdatedDate,
        UpdatedBy,
        IsDeleted
    FROM dbo.MedicineForm
    WHERE IsActive = 1
      AND IsDeleted = 0
    ORDER BY DisplayOrder;
END
GO
