CREATE OR ALTER PROCEDURE dbo.usp_ProfileType_GetAll
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        ProfileTypeId,
        Code,
        DisplayText,
        DisplayOrder,
        IsActive,
        CreatedDate,
        CreatedBy,
        UpdatedDate,
        UpdatedBy,
        IsDeleted
    FROM dbo.ProfileType
    WHERE IsActive = 1
      AND IsDeleted = 0
    ORDER BY DisplayOrder;
END
GO
