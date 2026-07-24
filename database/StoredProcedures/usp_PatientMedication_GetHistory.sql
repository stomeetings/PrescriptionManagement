-- Complete medication timeline for one patient - Active and every Stopped entry
-- (api-spec.md section 4.4 - GET /api/patients/{patientId}/medications/history).
-- Reconciled from this task's "usp_PM_GetPatientMedicationHistory". Returns the
-- row-per-Stop/Resume-cycle chain (PatientMedication rows), NOT the raw
-- PatientMedicationHistory JSON audit-log entries - see the approved api-spec.md
-- section 4.4/6 for why those two mechanisms are deliberately kept separate.
-- Chain-grouping by ResumedFromPatientMedicationId is left to the presentation layer;
-- this procedure returns a flat chronological list.
CREATE OR ALTER PROCEDURE dbo.usp_PatientMedication_GetHistory
    @PatientId INT,
    @Page INT,
    @PageSize INT
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @Offset INT = (@Page - 1) * @PageSize;

    -- Backed by IX_PatientMedication_Patient_Medicine / IX_PatientMedication_StartDate.
    -- No IsCurrent filter here, unlike usp_PatientMedication_GetCurrent - history must
    -- include stopped rows.
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
        pms.DisplayText AS StatusDisplayText,
        pm.ResumedFromPatientMedicationId
    FROM dbo.PatientMedication AS pm
    INNER JOIN dbo.Patient AS p ON p.PatientId = pm.PatientId
    INNER JOIN dbo.Medicine AS m ON m.MedicineId = pm.MedicineId
    INNER JOIN dbo.MedicineForm AS mf ON mf.MedicineFormId = m.MedicineFormId
    INNER JOIN dbo.MedicineRoute AS mr ON mr.MedicineRouteId = m.MedicineRouteId
    INNER JOIN dbo.DoseUnit AS du ON du.DoseUnitId = pm.DoseUnitId
    INNER JOIN dbo.Frequency AS fr ON fr.FrequencyId = pm.FrequencyId
    INNER JOIN dbo.DurationUnit AS dur ON dur.DurationUnitId = pm.DurationUnitId
    INNER JOIN dbo.PatientMedicationStatus AS pms ON pms.PatientMedicationStatusId = pm.PatientMedicationStatusId
    WHERE pm.PatientId = @PatientId
      AND pm.IsDeleted = 0
    ORDER BY pm.CreatedDate ASC
    OFFSET @Offset ROWS FETCH NEXT @PageSize ROWS ONLY;

    SELECT COUNT(*) AS TotalCount
    FROM dbo.PatientMedication AS pm
    WHERE pm.PatientId = @PatientId
      AND pm.IsDeleted = 0;
END
GO
