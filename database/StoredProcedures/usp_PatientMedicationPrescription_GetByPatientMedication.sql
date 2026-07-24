-- Patient Medication Details' new "Prescription History" section - every prescription
-- this Patient Medication has ever been linked to, chronological (oldest first, so the
-- Original -> Replacement -> Replacement chain reads top-to-bottom in creation order).
-- PrintCount is per-linked-prescription (COUNT of PrescriptionPrintHistory) - the
-- Application layer sums these across the whole chain for Medication Details' own
-- "Print Count" summary field, rather than this procedure returning two shapes.
CREATE OR ALTER PROCEDURE dbo.usp_PatientMedicationPrescription_GetByPatientMedication
    @PatientMedicationId INT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        pmp.PatientMedicationPrescriptionId,
        pmp.PrescriptionId,
        p.PrescriptionNumber,
        pmp.PrescriptionItemId,
        pmp.Scid,
        pmp.RelationshipType,
        pmp.CreatedBy AS LinkedBy,
        pmp.CreatedDate AS LinkedDate,
        p.IssueDate,
        ps.Code AS StatusCode,
        ps.DisplayText AS StatusDisplayText,
        pi.ItemStatus,
        (SELECT COUNT(*) FROM dbo.PrescriptionPrintHistory AS pph WHERE pph.PrescriptionId = pmp.PrescriptionId) AS PrintCount
    FROM dbo.PatientMedicationPrescription AS pmp
    INNER JOIN dbo.Prescription AS p ON p.PrescriptionId = pmp.PrescriptionId
    INNER JOIN dbo.PrescriptionStatus AS ps ON ps.PrescriptionStatusId = p.PrescriptionStatusId
    INNER JOIN dbo.PrescriptionItem AS pi ON pi.PrescriptionItemId = pmp.PrescriptionItemId
    WHERE pmp.PatientMedicationId = @PatientMedicationId
    ORDER BY pmp.CreatedDate ASC;
END
GO
