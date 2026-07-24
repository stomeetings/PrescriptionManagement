-- Gap-fill added during Step 8 (Service Layer): PatientMedicationStatus and
-- PatientMedicationSource were created as tables in Step 5 with only documented seed
-- values (database-spec.md sections on each table say "documented seed values only, no
-- SQL, per scope") - no prior step actually inserted rows. Without seed rows,
-- usp_PatientMedicationStatus_GetAll/usp_PatientMedicationSource_GetAll return empty
-- sets and the Service layer's code-to-Id lookups (ACTIVE/STOPPED,
-- MANUAL_ENTRY/PRESCRIPTION/IMPORTED) can never resolve. MERGE ON Code match keeps this
-- idempotent, matching MedicineLookupSeedData.sql's pattern.

MERGE INTO dbo.PatientMedicationStatus AS Target
USING (VALUES
    ('ACTIVE',  'Active',  1),
    ('STOPPED', 'Stopped', 2)
) AS Source (Code, DisplayText, DisplayOrder)
ON Target.Code = Source.Code
WHEN NOT MATCHED BY TARGET THEN
    INSERT (Code, DisplayText, DisplayOrder, CreatedBy)
    VALUES (Source.Code, Source.DisplayText, Source.DisplayOrder, 'System');
GO

MERGE INTO dbo.PatientMedicationSource AS Target
USING (VALUES
    ('MANUAL_ENTRY', 'Manual Entry', 1),
    ('PRESCRIPTION', 'Prescription', 2),
    ('IMPORTED',     'Imported',     3)
) AS Source (Code, DisplayText, DisplayOrder)
ON Target.Code = Source.Code
WHEN NOT MATCHED BY TARGET THEN
    INSERT (Code, DisplayText, DisplayOrder, CreatedBy)
    VALUES (Source.Code, Source.DisplayText, Source.DisplayOrder, 'System');
GO
