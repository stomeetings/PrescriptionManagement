-- Prescription Item Amendment & Replacement: "Find ACTIVE Prescription Item(s)" for a
-- Patient Medication. Can return MORE THAN ONE row - a single Patient Medication can end
-- up ACTIVE on more than one Prescription (e.g. selected independently into two separate
-- Generate Prescription actions) - nothing in this schema ever enforced the "unique
-- ACTIVE item per PatientMedicationId" assumption this comment used to make; only
-- "an item can only ever be superseded once" is actually enforced
-- (UQ_PrescriptionItemReplacement_PreviousItem). Used both by the frontend's "does this
-- medication belong to an active prescription" check (GET .../active - which only cares
-- whether at least one row comes back) and by PrescriptionItemAmendmentService, which
-- now supersedes every row this returns, not just the first.
CREATE OR ALTER PROCEDURE dbo.usp_PrescriptionItem_FindActiveByPatientMedication
    @PatientMedicationId INT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        pi.PrescriptionItemId,
        pi.PrescriptionId,
        pi.MedicineId,
        pi.Dose,
        pi.DoseUnitId,
        pi.FrequencyId,
        pi.Duration,
        pi.DurationUnitId,
        pi.Quantity,
        pi.Instructions,
        pi.PRN,
        pi.ItemStatus,
        pi.Scid,
        p.PrescriptionNumber,
        p.PatientId,
        p.ProviderUserAccountId,
        p.ClinicalNotes,
        ps.Code AS PrescriptionStatusCode
    FROM dbo.PrescriptionItem AS pi
    INNER JOIN dbo.Prescription AS p ON p.PrescriptionId = pi.PrescriptionId
    INNER JOIN dbo.PrescriptionStatus AS ps ON ps.PrescriptionStatusId = p.PrescriptionStatusId
    WHERE pi.PatientMedicationId = @PatientMedicationId
      AND pi.ItemStatus = 'ACTIVE'
      AND p.IsDeleted = 0
    ORDER BY pi.PrescriptionItemId DESC;
END
GO
