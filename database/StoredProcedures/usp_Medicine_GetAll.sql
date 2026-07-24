CREATE OR ALTER PROCEDURE dbo.usp_Medicine_GetAll
    @Page INT,
    @PageSize INT,
    @SortBy NVARCHAR(50) = N'createdDate',
    @SortDirection NVARCHAR(4) = N'DESC'
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @Offset INT = (@Page - 1) * @PageSize;

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
        m.IsControlledDrug,
        m.IsActive,
        m.CreatedDate,
        m.UpdatedDate
    FROM dbo.Medicine AS m
    INNER JOIN dbo.MedicineForm AS mf ON mf.MedicineFormId = m.MedicineFormId
    INNER JOIN dbo.MedicineRoute AS mr ON mr.MedicineRouteId = m.MedicineRouteId
    WHERE m.IsDeleted = 0
    ORDER BY
        CASE WHEN @SortDirection = N'ASC' AND @SortBy = N'medicineCode' THEN m.MedicineCode END ASC,
        CASE WHEN @SortDirection = N'ASC' AND @SortBy = N'medicineName' THEN m.MedicineName END ASC,
        CASE WHEN @SortDirection = N'ASC' AND @SortBy = N'genericName' THEN m.GenericName END ASC,
        CASE WHEN @SortDirection = N'ASC' AND @SortBy = N'brandName' THEN m.BrandName END ASC,
        CASE WHEN @SortDirection = N'ASC' AND @SortBy = N'strength' THEN m.Strength END ASC,
        CASE WHEN @SortDirection = N'ASC' AND @SortBy = N'manufacturer' THEN m.Manufacturer END ASC,
        CASE WHEN @SortDirection = N'ASC' AND @SortBy = N'createdDate' THEN m.CreatedDate END ASC,
        CASE WHEN @SortDirection = N'ASC' AND @SortBy = N'updatedDate' THEN m.UpdatedDate END ASC,
        CASE WHEN @SortDirection = N'DESC' AND @SortBy = N'medicineCode' THEN m.MedicineCode END DESC,
        CASE WHEN @SortDirection = N'DESC' AND @SortBy = N'medicineName' THEN m.MedicineName END DESC,
        CASE WHEN @SortDirection = N'DESC' AND @SortBy = N'genericName' THEN m.GenericName END DESC,
        CASE WHEN @SortDirection = N'DESC' AND @SortBy = N'brandName' THEN m.BrandName END DESC,
        CASE WHEN @SortDirection = N'DESC' AND @SortBy = N'strength' THEN m.Strength END DESC,
        CASE WHEN @SortDirection = N'DESC' AND @SortBy = N'manufacturer' THEN m.Manufacturer END DESC,
        CASE WHEN @SortDirection = N'DESC' AND @SortBy = N'createdDate' THEN m.CreatedDate END DESC,
        CASE WHEN @SortDirection = N'DESC' AND @SortBy = N'updatedDate' THEN m.UpdatedDate END DESC,
        m.CreatedDate DESC
    OFFSET @Offset ROWS FETCH NEXT @PageSize ROWS ONLY;

    SELECT COUNT(*) AS TotalCount
    FROM dbo.Medicine AS m
    WHERE m.IsDeleted = 0;
END
GO
