CREATE OR ALTER PROCEDURE dbo.usp_MedicineRoute_GetAll
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        MedicineRouteId,
        Code,
        DisplayText,
        DisplayOrder,
        IsActive,
        CreatedDate,
        CreatedBy,
        UpdatedDate,
        UpdatedBy,
        IsDeleted
    FROM dbo.MedicineRoute
    WHERE IsActive = 1
      AND IsDeleted = 0
    ORDER BY DisplayOrder;
END
GO
