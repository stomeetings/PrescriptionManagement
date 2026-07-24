-- Prescription Details' new "Originating Patient Medication" display - the Patient
-- Medication(s) each item on this Prescription was created from. A replacement
-- Prescription always has exactly one row (it contains only the amended medication);
-- an original Prescription can have several, one per selected medication, matching
-- Patient Medication's own "can have multiple Prescription Items" business rule read in
-- the other direction. Items with no PatientMedicationId (none exist yet in practice -
-- every item is currently drafted from a real Patient Medication - but the column is
-- nullable) are simply absent from this result set, not returned as a null-filled row.
CREATE OR ALTER PROCEDURE dbo.usp_PatientMedicationPrescription_GetByPrescription
    @PrescriptionId INT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        pmp.PatientMedicationId,
        pi.MedicineNameSnapshot AS MedicineName,
        pmp.RelationshipType,
        pmp.Scid,
        pm.IsCurrent,
        pm.IsActive AS PatientMedicationIsActive
    FROM dbo.PatientMedicationPrescription AS pmp
    INNER JOIN dbo.PrescriptionItem AS pi ON pi.PrescriptionItemId = pmp.PrescriptionItemId
    INNER JOIN dbo.PatientMedication AS pm ON pm.PatientMedicationId = pmp.PatientMedicationId
    WHERE pmp.PrescriptionId = @PrescriptionId
    ORDER BY pmp.PatientMedicationPrescriptionId;
END
GO
