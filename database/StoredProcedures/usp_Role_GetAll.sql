CREATE OR ALTER PROCEDURE dbo.usp_Role_GetAll
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        RoleId,
        Code,
        DisplayText,
        DisplayOrder,
        IsActive,
        CreatedDate,
        CreatedBy,
        UpdatedDate,
        UpdatedBy,
        IsDeleted
    FROM dbo.Role
    WHERE IsActive = 1
      AND IsDeleted = 0
    ORDER BY DisplayOrder;
END
GO
