-- Full detail for one Patient Medication (api-spec.md section 4.2). Reconciled from
-- this task's "usp_PM_GetPatientMedicationById" - see usp_PatientMedication_GetAll.sql
-- for the naming rationale.
CREATE OR ALTER PROCEDURE dbo.usp_PatientMedication_GetById
    @PatientMedicationId INT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        pm.PatientMedicationId,
        pm.PatientId,
        p.PatientNumber,
        p.FirstName + N' ' + p.LastName AS PatientFullName,
        pm.MedicineId,
        m.MedicineCode,
        m.MedicineName,
        m.GenericName,
        m.Strength,
        m.IsActive AS MedicineIsActive,
        mf.Code AS MedicineFormCode,
        mf.DisplayText AS MedicineFormDisplayText,
        mr.Code AS MedicineRouteCode,
        mr.DisplayText AS MedicineRouteDisplayText,
        pm.Dose,
        pm.DoseUnitId,
        du.Code AS DoseUnitCode,
        du.DisplayText AS DoseUnitDisplayText,
        pm.FrequencyId,
        fr.Code AS FrequencyCode,
        fr.DisplayText AS FrequencyDisplayText,
        pm.Duration,
        pm.DurationUnitId,
        dur.Code AS DurationUnitCode,
        dur.DisplayText AS DurationUnitDisplayText,
        pm.Quantity,
        pm.Instructions,
        pm.PRN,
        pm.StartDate,
        pm.EndDate,
        pm.ClinicalNotes,
        pm.PrescribedByUserAccountId,
        ua.FullName AS PrescribedByFullName,
        pmsrc.Code AS SourceCode,
        pmsrc.DisplayText AS SourceDisplayText,
        pms.Code AS StatusCode,
        pms.DisplayText AS StatusDisplayText,
        pm.IsCurrent,
        pm.ResumedFromPatientMedicationId,
        pm.CreatedDate,
        pm.CreatedBy,
        pm.UpdatedDate,
        pm.UpdatedBy,
        pm.StoppedDate,
        pm.StoppedBy,
        pm.RowVersion
    FROM dbo.PatientMedication AS pm
    INNER JOIN dbo.Patient AS p ON p.PatientId = pm.PatientId
    INNER JOIN dbo.Medicine AS m ON m.MedicineId = pm.MedicineId
    INNER JOIN dbo.MedicineForm AS mf ON mf.MedicineFormId = m.MedicineFormId
    INNER JOIN dbo.MedicineRoute AS mr ON mr.MedicineRouteId = m.MedicineRouteId
    INNER JOIN dbo.DoseUnit AS du ON du.DoseUnitId = pm.DoseUnitId
    INNER JOIN dbo.Frequency AS fr ON fr.FrequencyId = pm.FrequencyId
    INNER JOIN dbo.DurationUnit AS dur ON dur.DurationUnitId = pm.DurationUnitId
    INNER JOIN dbo.PatientMedicationSource AS pmsrc ON pmsrc.PatientMedicationSourceId = pm.PatientMedicationSourceId
    INNER JOIN dbo.PatientMedicationStatus AS pms ON pms.PatientMedicationStatusId = pm.PatientMedicationStatusId
    LEFT JOIN dbo.UserAccount AS ua ON ua.UserAccountId = pm.PrescribedByUserAccountId
    WHERE pm.PatientMedicationId = @PatientMedicationId
      AND pm.IsDeleted = 0;
END
GO
