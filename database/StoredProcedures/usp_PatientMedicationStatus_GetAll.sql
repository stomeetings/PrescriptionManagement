-- Gap-fill added during Step 8 (Service Layer): PatientMedicationStatus was created as a
-- table in Step 5 and used via JOIN inside the usp_PatientMedication_* procedures ever
-- since, but never got its own GetAll lookup procedure the way DoseUnit/Frequency/
-- DurationUnit/etc. all do. The Service layer needs to resolve status codes (ACTIVE/
-- STOPPED) to their numeric Ids, so this mirrors usp_DoseUnit_GetAll exactly.
CREATE OR ALTER PROCEDURE dbo.usp_PatientMedicationStatus_GetAll
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        PatientMedicationStatusId,
        Code,
        DisplayText,
        DisplayOrder,
        IsActive,
        CreatedDate,
        CreatedBy,
        UpdatedDate,
        UpdatedBy,
        IsDeleted
    FROM dbo.PatientMedicationStatus
    WHERE IsActive = 1
      AND IsDeleted = 0
    ORDER BY DisplayOrder;
END
GO
