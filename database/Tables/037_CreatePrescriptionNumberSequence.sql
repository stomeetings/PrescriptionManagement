-- Prescription Management Phase 1 (database-spec.md section 3.4): SEQUENCE object (not
-- a table) backing system-generated PrescriptionNumber values. Mirrors
-- Patient_PatientNumberSequence's exact, already-established pattern (025) - NEXT VALUE
-- FOR is atomic, so two concurrent usp_Prescription_CreateDraft calls can never be
-- issued the same number. The stored procedure formats the numeric value (e.g.
-- zero-padded with an 'RX-' prefix) at insert time; this script only creates the raw
-- numeric generator.

IF NOT EXISTS (SELECT 1 FROM sys.sequences WHERE name = 'Prescription_PrescriptionNumberSequence' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
    CREATE SEQUENCE dbo.Prescription_PrescriptionNumberSequence
        AS INT
        START WITH 1
        INCREMENT BY 1
        NO CYCLE;
END
GO
