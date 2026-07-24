-- Patient Medication Management: cross-patient paginated list with basic search/filter/
-- sort (api-spec.md section 4.1 - GET /api/patient-medications). Naming note: this task's
-- own requirements name this procedure "usp_PM_GetPatientMedications" - reconciled here
-- to "usp_PatientMedication_GetAll" to match CLAUDE.md's stated usp_<Entity>_<Action>
-- convention and every other module's actual naming (usp_Patient_GetAll,
-- usp_Medicine_GetAll), not a project-specific abbreviation used nowhere else.
--
-- "Search, Filtering" here are the basic query-string set (searchTerm/statusCode/
-- isPrn); the richer "advanced filtering" this task also asks for lives in the separate
-- usp_PatientMedication_Search, matching the approved api-spec.md section 2's explicit
-- two-mechanism design - not a redundant duplicate of this procedure.
CREATE OR ALTER PROCEDURE dbo.usp_PatientMedication_GetAll
    @Page INT,
    @PageSize INT,
    @SearchTerm NVARCHAR(256) = NULL,
    @StatusCode NVARCHAR(50) = NULL,
    @IsPrn BIT = NULL,
    @SortBy NVARCHAR(50) = N'createdDate',
    @SortDirection NVARCHAR(4) = N'DESC'
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @Offset INT = (@Page - 1) * @PageSize;

    SELECT
        pm.PatientMedicationId,
        pm.PatientId,
        p.PatientNumber,
        p.FirstName + N' ' + p.LastName AS PatientFullName,
        pm.MedicineId,
        m.MedicineName,
        m.GenericName,
        m.Strength,
        mf.Code AS MedicineFormCode,
        mf.DisplayText AS MedicineFormDisplayText,
        mr.Code AS MedicineRouteCode,
        mr.DisplayText AS MedicineRouteDisplayText,
        pm.Dose,
        du.Code AS DoseUnitCode,
        du.DisplayText AS DoseUnitDisplayText,
        fr.Code AS FrequencyCode,
        fr.DisplayText AS FrequencyDisplayText,
        pm.Duration,
        dur.Code AS DurationUnitCode,
        dur.DisplayText AS DurationUnitDisplayText,
        pm.Quantity,
        pm.PRN,
        pm.StartDate,
        pm.EndDate,
        pms.Code AS StatusCode,
        pms.DisplayText AS StatusDisplayText
    FROM dbo.PatientMedication AS pm
    INNER JOIN dbo.Patient AS p ON p.PatientId = pm.PatientId
    INNER JOIN dbo.Medicine AS m ON m.MedicineId = pm.MedicineId
    INNER JOIN dbo.MedicineForm AS mf ON mf.MedicineFormId = m.MedicineFormId
    INNER JOIN dbo.MedicineRoute AS mr ON mr.MedicineRouteId = m.MedicineRouteId
    INNER JOIN dbo.DoseUnit AS du ON du.DoseUnitId = pm.DoseUnitId
    INNER JOIN dbo.Frequency AS fr ON fr.FrequencyId = pm.FrequencyId
    INNER JOIN dbo.DurationUnit AS dur ON dur.DurationUnitId = pm.DurationUnitId
    INNER JOIN dbo.PatientMedicationStatus AS pms ON pms.PatientMedicationStatusId = pm.PatientMedicationStatusId
    WHERE pm.IsDeleted = 0
      -- Backed by IX_PatientMedication_StartDate/MedicineId when the LIKE conditions
      -- resolve to a narrow set; the leading-wildcard caveat already documented for
      -- Patient/Medicine search applies identically here.
      AND (@SearchTerm IS NULL
           OR p.FirstName LIKE N'%' + @SearchTerm + N'%'
           OR p.LastName LIKE N'%' + @SearchTerm + N'%'
           OR m.MedicineName LIKE N'%' + @SearchTerm + N'%'
           OR m.GenericName LIKE N'%' + @SearchTerm + N'%')
      AND (@StatusCode IS NULL OR pms.Code = @StatusCode)
      AND (@IsPrn IS NULL OR pm.PRN = @IsPrn)
    ORDER BY
        CASE WHEN @SortDirection = N'ASC' AND @SortBy = N'startDate' THEN pm.StartDate END ASC,
        CASE WHEN @SortDirection = N'ASC' AND @SortBy = N'medicineName' THEN m.MedicineName END ASC,
        CASE WHEN @SortDirection = N'ASC' AND @SortBy = N'patientName' THEN p.LastName END ASC,
        CASE WHEN @SortDirection = N'ASC' AND @SortBy = N'createdDate' THEN pm.CreatedDate END ASC,
        CASE WHEN @SortDirection = N'DESC' AND @SortBy = N'startDate' THEN pm.StartDate END DESC,
        CASE WHEN @SortDirection = N'DESC' AND @SortBy = N'medicineName' THEN m.MedicineName END DESC,
        CASE WHEN @SortDirection = N'DESC' AND @SortBy = N'patientName' THEN p.LastName END DESC,
        CASE WHEN @SortDirection = N'DESC' AND @SortBy = N'createdDate' THEN pm.CreatedDate END DESC,
        pm.CreatedDate DESC
    OFFSET @Offset ROWS FETCH NEXT @PageSize ROWS ONLY;

    SELECT COUNT(*) AS TotalCount
    FROM dbo.PatientMedication AS pm
    INNER JOIN dbo.Patient AS p ON p.PatientId = pm.PatientId
    INNER JOIN dbo.Medicine AS m ON m.MedicineId = pm.MedicineId
    INNER JOIN dbo.PatientMedicationStatus AS pms ON pms.PatientMedicationStatusId = pm.PatientMedicationStatusId
    WHERE pm.IsDeleted = 0
      AND (@SearchTerm IS NULL
           OR p.FirstName LIKE N'%' + @SearchTerm + N'%'
           OR p.LastName LIKE N'%' + @SearchTerm + N'%'
           OR m.MedicineName LIKE N'%' + @SearchTerm + N'%'
           OR m.GenericName LIKE N'%' + @SearchTerm + N'%')
      AND (@StatusCode IS NULL OR pms.Code = @StatusCode)
      AND (@IsPrn IS NULL OR pm.PRN = @IsPrn);
END
GO
