CREATE OR ALTER PROCEDURE dbo.usp_Frequency_GetAll
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        FrequencyId,
        Code,
        DisplayText,
        DisplayOrder,
        IsActive,
        CreatedDate,
        CreatedBy,
        UpdatedDate,
        UpdatedBy,
        IsDeleted
    FROM dbo.Frequency
    WHERE IsActive = 1
      AND IsDeleted = 0
    ORDER BY DisplayOrder;
END
GO
