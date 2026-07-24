-- Gap-fill added during Step 8 (Service Layer): same reasoning as
-- usp_PatientMedicationStatus_GetAll.sql - PatientMedicationSource was created in Step 5
-- and joined ever since inside usp_PatientMedication_* but never had its own lookup
-- procedure. Mirrors usp_DoseUnit_GetAll exactly.
CREATE OR ALTER PROCEDURE dbo.usp_PatientMedicationSource_GetAll
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        PatientMedicationSourceId,
        Code,
        DisplayText,
        DisplayOrder,
        IsActive,
        CreatedDate,
        CreatedBy,
        UpdatedDate,
        UpdatedBy,
        IsDeleted
    FROM dbo.PatientMedicationSource
    WHERE IsActive = 1
      AND IsDeleted = 0
    ORDER BY DisplayOrder;
END
GO
