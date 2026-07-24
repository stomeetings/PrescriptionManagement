CREATE OR ALTER PROCEDURE dbo.usp_Medicine_GetById
    @MedicineId INT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        m.MedicineId,
        m.MedicineCode,
        m.MedicineName,
        m.GenericName,
        m.BrandName,
        m.Strength,
        m.MedicineFormId,
        mf.Code AS MedicineFormCode,
        mf.DisplayText AS MedicineFormDisplayText,
        m.MedicineRouteId,
        mr.Code AS MedicineRouteCode,
        mr.DisplayText AS MedicineRouteDisplayText,
        m.Manufacturer,
        m.ATCCode,
        m.IsControlledDrug,
        m.IsActive,
        m.Notes,
        m.CreatedDate,
        m.CreatedBy,
        m.UpdatedDate,
        m.UpdatedBy,
        m.RowVersion
    FROM dbo.Medicine AS m
    INNER JOIN dbo.MedicineForm AS mf ON mf.MedicineFormId = m.MedicineFormId
    INNER JOIN dbo.MedicineRoute AS mr ON mr.MedicineRouteId = m.MedicineRouteId
    WHERE m.MedicineId = @MedicineId
      AND m.IsDeleted = 0;
END
GO
