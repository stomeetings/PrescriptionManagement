CREATE OR ALTER PROCEDURE dbo.usp_Gender_GetAll
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        GenderId,
        Code,
        DisplayText,
        DisplayOrder,
        IsActive,
        CreatedDate,
        CreatedBy,
        UpdatedDate,
        UpdatedBy,
        IsDeleted
    FROM dbo.Gender
    WHERE IsActive = 1
      AND IsDeleted = 0
    ORDER BY DisplayOrder;
END
GO
