-- Patient Management: SEQUENCE object (not a table) backing system-generated
-- PatientNumber values (database-spec.md section 3.3). NEXT VALUE FOR is atomic, so two
-- concurrent usp_Patient_Create calls (Step 4, not part of this script) can never be
-- issued the same number - avoiding a "read max, add one" race condition in application
-- code. The stored procedure formats the numeric value (e.g. zero-padded with a 'PT-'
-- prefix) at insert time; this script only creates the raw numeric generator.

IF NOT EXISTS (SELECT 1 FROM sys.sequences WHERE name = 'Patient_PatientNumberSequence' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
    CREATE SEQUENCE dbo.Patient_PatientNumberSequence
        AS INT
        START WITH 1
        INCREMENT BY 1
        NO CYCLE;
END
GO
