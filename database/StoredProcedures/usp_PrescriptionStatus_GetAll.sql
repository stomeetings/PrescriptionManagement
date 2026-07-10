CREATE OR ALTER PROCEDURE dbo.usp_PrescriptionStatus_GetAll
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        PrescriptionStatusId,
        Code,
        DisplayText,
        DisplayOrder,
        IsActive,
        CreatedDate,
        CreatedBy,
        UpdatedDate,
        UpdatedBy,
        IsDeleted
    FROM dbo.PrescriptionStatus
    WHERE IsActive = 1
      AND IsDeleted = 0
    ORDER BY DisplayOrder;
END
GO
