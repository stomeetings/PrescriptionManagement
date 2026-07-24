-- Minimal GetById lookup (Step 18.6's own prerequisite - PDF generation needs to fetch
-- a saved Prescription's Xhtml/PrescriptionNumber by id). Does not include line items -
-- the future Prescription Editor (Step 18.5, not yet built) will need its own richer
-- read model; this stays scoped to exactly what PDF generation needs today, per this
-- project's "don't design for hypothetical future requirements" convention.
CREATE OR ALTER PROCEDURE dbo.usp_Prescription_GetById
    @PrescriptionId INT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        p.PrescriptionId,
        p.PrescriptionNumber,
        p.DraftPrescriptionId,
        p.PatientId,
        p.ProviderUserAccountId,
        ps.Code AS StatusCode,
        ps.DisplayText AS StatusDisplayText,
        p.ClinicalNotes,
        p.Xhtml,
        p.IssueDate,
        p.ExpiryDate,
        p.RowVersion,
        p.CreatedDate,
        p.CreatedBy,
        p.UpdatedDate,
        p.UpdatedBy
    FROM dbo.Prescription AS p
    INNER JOIN dbo.PrescriptionStatus AS ps ON ps.PrescriptionStatusId = p.PrescriptionStatusId
    WHERE p.PrescriptionId = @PrescriptionId
      AND p.IsDeleted = 0;
END
GO
