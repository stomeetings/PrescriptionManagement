CREATE OR ALTER PROCEDURE dbo.usp_DurationUnit_GetAll
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        DurationUnitId,
        Code,
        DisplayText,
        DisplayOrder,
        IsActive,
        CreatedDate,
        CreatedBy,
        UpdatedDate,
        UpdatedBy,
        IsDeleted
    FROM dbo.DurationUnit
    WHERE IsActive = 1
      AND IsDeleted = 0
    ORDER BY DisplayOrder;
END
GO
