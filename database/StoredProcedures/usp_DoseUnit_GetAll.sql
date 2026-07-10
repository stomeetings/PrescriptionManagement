CREATE OR ALTER PROCEDURE dbo.usp_DoseUnit_GetAll
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        DoseUnitId,
        Code,
        DisplayText,
        DisplayOrder,
        IsActive,
        CreatedDate,
        CreatedBy,
        UpdatedDate,
        UpdatedBy,
        IsDeleted
    FROM dbo.DoseUnit
    WHERE IsActive = 1
      AND IsDeleted = 0
    ORDER BY DisplayOrder;
END
GO
