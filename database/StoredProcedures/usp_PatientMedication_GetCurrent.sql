-- Current (Active) medications for one patient (api-spec.md section 4.3 -
-- GET /api/patients/{patientId}/medications). Reconciled from this task's
-- "usp_PM_GetCurrentPatientMedications" - see usp_PatientMedication_GetAll.sql for the
-- naming rationale. Does not validate that @PatientId exists - a non-existent patient
-- simply returns zero rows (404-vs-empty-list is a Service/Controller-layer decision,
-- matching every other module's GetById-style precedent).
-- PrescriptionLinkStatus added by Patient Medication and Prescription Synchronization -
-- a single computed column (not a per-row API call from the frontend, which would be an
-- N+1 problem for a paginated list) backing the List's own Never/Currently Prescribed/
-- Superseded badge. Only wired into this procedure (the per-patient Current Medications
-- tab, where "currently prescribed" is most relevant) - GetAll/Search/GetHistory don't
-- surface this same column in this pass, a deliberate scope trim given this feature's
-- already large surface area; the frontend badge component itself still defines
-- Completed/Cancelled for schema-completeness even though nothing produces either value
-- yet (no Dispense/Cancel action exists).
CREATE OR ALTER PROCEDURE dbo.usp_PatientMedication_GetCurrent
    @PatientId INT,
    @Page INT,
    @PageSize INT,
    @SortBy NVARCHAR(50) = N'startDate',
    @SortDirection NVARCHAR(4) = N'DESC'
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @Offset INT = (@Page - 1) * @PageSize;

    -- Backed by IX_PatientMedication_Patient_IsCurrent (PatientId, IsCurrent).
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
        CASE
            WHEN NOT EXISTS (SELECT 1 FROM dbo.PatientMedicationPrescription AS pmp WHERE pmp.PatientMedicationId = pm.PatientMedicationId)
                THEN 'NEVER_PRESCRIBED'
            WHEN EXISTS (
                SELECT 1 FROM dbo.PatientMedicationPrescription AS pmp
                INNER JOIN dbo.PrescriptionItem AS pi ON pi.PrescriptionItemId = pmp.PrescriptionItemId
                WHERE pmp.PatientMedicationId = pm.PatientMedicationId AND pi.ItemStatus = 'ACTIVE'
            ) THEN 'CURRENTLY_PRESCRIBED'
            ELSE 'SUPERSEDED'
        END AS PrescriptionLinkStatus
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
      AND pm.IsCurrent = 1
      AND pm.IsDeleted = 0
    ORDER BY
        CASE WHEN @SortDirection = N'ASC' AND @SortBy = N'startDate' THEN pm.StartDate END ASC,
        CASE WHEN @SortDirection = N'ASC' AND @SortBy = N'medicineName' THEN m.MedicineName END ASC,
        CASE WHEN @SortDirection = N'DESC' AND @SortBy = N'startDate' THEN pm.StartDate END DESC,
        CASE WHEN @SortDirection = N'DESC' AND @SortBy = N'medicineName' THEN m.MedicineName END DESC,
        pm.StartDate DESC
    OFFSET @Offset ROWS FETCH NEXT @PageSize ROWS ONLY;

    SELECT COUNT(*) AS TotalCount
    FROM dbo.PatientMedication AS pm
    WHERE pm.PatientId = @PatientId
      AND pm.IsCurrent = 1
      AND pm.IsDeleted = 0;
END
GO
