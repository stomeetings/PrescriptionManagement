-- Prescription module workflow enforcement: "Prescription Items must always originate
-- from Patient Medication records" - the Prescription module must never let a user
-- search the Medicine Master or create a Prescription Item independent of an existing
-- Patient Medication (mandatory, application-wide business rule). PatientMedicationId
-- was originally left NULLable (041_CreatePrescriptionItem.sql) to reserve room for a
-- speculative future "add a medicine directly from the Medicine Master" capability
-- (docs/patient-medications/patient-medication-management.md section 11.3) - that
-- capability is now explicitly forbidden everywhere in the application, so this column
-- is tightened to NOT NULL, turning the rule into a real database-level guarantee rather
-- than only a UI convention.
-- Safe to apply: every writer of this table (usp_Prescription_CreateDraft,
-- usp_Prescription_UpdateDraft, usp_Prescription_Renew, usp_PrescriptionItem_Amend) has
-- always populated PatientMedicationId from an existing Patient Medication - no row has
-- ever been written with it NULL. Guarded twice: only runs if the column is still
-- nullable, and only if no NULL rows actually exist (defensive - if this guard ever
-- fails, that indicates unexpected data that needs investigating, not a migration to
-- force through).

IF EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID('dbo.PrescriptionItem') AND name = 'PatientMedicationId' AND is_nullable = 1
)
AND NOT EXISTS (SELECT 1 FROM dbo.PrescriptionItem WHERE PatientMedicationId IS NULL)
BEGIN
    ALTER TABLE dbo.PrescriptionItem ALTER COLUMN PatientMedicationId INT NOT NULL;
END
GO
