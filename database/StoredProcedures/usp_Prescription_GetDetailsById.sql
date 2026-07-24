-- Prescription Details page - a new, dedicated read model, separate from
-- usp_Prescription_GetById (Step 18.6's minimal Xhtml/PrescriptionNumber lookup for PDF
-- generation, which stays untouched - PrescriptionPdfService never needs Patient/
-- Provider/Items/Audit, so extending that procedure would be scope creep onto a
-- different concern). Three result sets: header (Prescription + Patient + Provider +
-- computed MedicationCount/VersionNumber/PrintCount), line items (Medication Grid - now
-- including ItemStatus/Scid and, via a LEFT JOIN to PrescriptionItemReplacement, the
-- Superseded/replacement info Prescription Item Amendment & Replacement's own spec asks
-- for), and timeline (PrescriptionAudit UNION ALL PrescriptionPrintHistory UNION ALL
-- PrescriptionItemAmendment UNION ALL PrescriptionItemHistory UNION ALL
-- PrescriptionRenewal - see
-- PrescriptionTimeline.jsx's own comment for how these map to displayed events; the
-- union keeps a single existing result shape/DTO instead of adding a second timeline
-- source the frontend would need to merge itself). No CHECK for "does this prescription
-- exist" here - an empty header result set is the signal; the Repository/Controller
-- layer turns that into a 404, same convention as every other plain GetById in this
-- project (PatientsController.GetById).
CREATE OR ALTER PROCEDURE dbo.usp_Prescription_GetDetailsById
    @PrescriptionId INT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        p.PrescriptionId,
        p.PrescriptionNumber,
        ps.Code AS StatusCode,
        ps.DisplayText AS StatusDisplayText,
        (SELECT MAX(pv.VersionNumber) FROM dbo.PrescriptionVersion AS pv WHERE pv.PrescriptionId = p.PrescriptionId) AS VersionNumber,
        p.IssueDate,
        p.ExpiryDate,
        (SELECT COUNT(*) FROM dbo.PrescriptionItem AS pi WHERE pi.PrescriptionId = p.PrescriptionId) AS MedicationCount,
        (SELECT COUNT(*) FROM dbo.PrescriptionPrintHistory AS pph WHERE pph.PrescriptionId = p.PrescriptionId) AS PrintCount,
        p.ClinicalNotes,
        p.CreatedBy,
        p.CreatedDate,
        p.UpdatedBy,
        p.UpdatedDate,
        p.FinalizedDate,
        p.FinalizedBy,
        p.RowVersion,
        p.Xhtml,
        pt.PatientId,
        pt.FirstName AS PatientFirstName,
        pt.LastName AS PatientLastName,
        pt.NHINumber,
        pt.DateOfBirth AS PatientDateOfBirth,
        g.Code AS GenderCode,
        g.DisplayText AS GenderDisplayText,
        pt.MobileNumber AS PatientMobileNumber,
        pt.AddressLine1 AS PatientAddressLine1,
        pt.AddressLine2 AS PatientAddressLine2,
        pt.City AS PatientCity,
        pt.Region AS PatientRegion,
        pt.PostalCode AS PatientPostalCode,
        pt.Country AS PatientCountry,
        ua.UserAccountId AS ProviderUserAccountId,
        ua.FullName AS ProviderName,
        ua.Email AS ProviderEmail,
        ua.PhoneNumber AS ProviderPhoneNumber
    FROM dbo.Prescription AS p
    INNER JOIN dbo.Patient AS pt ON pt.PatientId = p.PatientId
    INNER JOIN dbo.Gender AS g ON g.GenderId = pt.GenderId
    INNER JOIN dbo.UserAccount AS ua ON ua.UserAccountId = p.ProviderUserAccountId
    INNER JOIN dbo.PrescriptionStatus AS ps ON ps.PrescriptionStatusId = p.PrescriptionStatusId
    WHERE p.PrescriptionId = @PrescriptionId AND p.IsDeleted = 0;

    -- ItemStatus/Scid added by Prescription Item Amendment & Replacement - PrescriptionItem
    -- is no longer a pure immutable snapshot with zero status (that was true before this
    -- feature; see 061's own comment for the reversal). ReplacementPrescriptionNumber/
    -- ReplacementScid/ReplacementDate come from a LEFT JOIN to PrescriptionItemReplacement
    -- (NULL for every item that has never been superseded).
    SELECT
        pi.PrescriptionItemId,
        pi.MedicineId,
        pi.MedicineNameSnapshot,
        pi.GenericNameSnapshot,
        pi.StrengthSnapshot,
        pi.DosageFormSnapshot,
        pi.RouteSnapshot,
        pi.Dose,
        pi.DoseUnitSnapshot,
        pi.FrequencySnapshot,
        pi.Duration,
        pi.DurationUnitSnapshot,
        pi.Quantity,
        pi.Instructions,
        pi.PRN,
        pi.ItemStatus,
        pi.Scid,
        rp.PrescriptionNumber AS ReplacementPrescriptionNumber,
        pir.ReplacementScid,
        pir.CreatedDate AS ReplacementDate
    FROM dbo.PrescriptionItem AS pi
    LEFT JOIN dbo.PrescriptionItemReplacement AS pir ON pir.PreviousPrescriptionItemId = pi.PrescriptionItemId
    LEFT JOIN dbo.Prescription AS rp ON rp.PrescriptionId = pir.ReplacementPrescriptionId
    WHERE pi.PrescriptionId = @PrescriptionId
    ORDER BY pi.PrescriptionItemId;

    SELECT Action, ChangedBy, ChangedDate, VersionNumber, ChangedFields
    FROM (
        SELECT
            pa.Action,
            pa.ChangedBy,
            pa.ChangedDate,
            pa.VersionNumber,
            pa.ChangedFields
        FROM dbo.PrescriptionAudit AS pa
        WHERE pa.PrescriptionId = @PrescriptionId

        UNION ALL

        -- Reprint Prescription: PrescriptionPrintHistory rows shaped onto the same
        -- Action/ChangedBy/ChangedDate/VersionNumber/ChangedFields columns as
        -- PrescriptionAudit - ChangedFields carries the reprint Reason, reusing the
        -- Timeline's existing "show ChangedFields as a subtitle" rendering with no new
        -- frontend field.
        SELECT
            pph.PrintType AS Action,
            pph.PrintedBy AS ChangedBy,
            pph.PrintedDate AS ChangedDate,
            pph.VersionPrinted AS VersionNumber,
            pph.Reason AS ChangedFields
        FROM dbo.PrescriptionPrintHistory AS pph
        WHERE pph.PrescriptionId = @PrescriptionId

        UNION ALL

        -- Prescription Item Amendment & Replacement: "Medication Updated" - the
        -- amendment's own diff record, scoped to whichever prescription held the item
        -- being amended (the original, since PreviousPrescriptionItemId always points
        -- there).
        SELECT
            'AMENDED' AS Action,
            pia.AmendedBy AS ChangedBy,
            pia.AmendedDate AS ChangedDate,
            NULL AS VersionNumber,
            pia.Reason AS ChangedFields
        FROM dbo.PrescriptionItemAmendment AS pia
        INNER JOIN dbo.PrescriptionItem AS pi_a ON pi_a.PrescriptionItemId = pia.PreviousPrescriptionItemId
        WHERE pi_a.PrescriptionId = @PrescriptionId

        UNION ALL

        -- "Prescription Item Superseded" (logged against the old item) and "New SCID
        -- Generated" (REPLACEMENT_CREATED, logged against the new item) - each row lands
        -- on whichever prescription (original or replacement) actually owns that item.
        SELECT
            pih.Action,
            pih.ChangedBy,
            pih.ChangedDate,
            NULL AS VersionNumber,
            pih.Notes AS ChangedFields
        FROM dbo.PrescriptionItemHistory AS pih
        INNER JOIN dbo.PrescriptionItem AS pi_h ON pi_h.PrescriptionItemId = pih.PrescriptionItemId
        WHERE pi_h.PrescriptionId = @PrescriptionId

        UNION ALL

        -- Prescription Renewal: one PrescriptionRenewal row surfaces as two different
        -- events depending on which side of it @PrescriptionId is - RENEWED on the
        -- original ("this was renewed, see the new prescription"), RENEWED_FROM on the
        -- renewed copy ("this came from renewing that one"). ChangedFields carries the
        -- other prescription's own number so the Timeline can show it without a second
        -- lookup.
        SELECT
            CASE WHEN pr.OriginalPrescriptionId = @PrescriptionId THEN 'RENEWED' ELSE 'RENEWED_FROM' END AS Action,
            pr.RenewedBy AS ChangedBy,
            pr.RenewalDate AS ChangedDate,
            NULL AS VersionNumber,
            CASE WHEN pr.OriginalPrescriptionId = @PrescriptionId THEN renewedP.PrescriptionNumber ELSE originalP.PrescriptionNumber END AS ChangedFields
        FROM dbo.PrescriptionRenewal AS pr
        INNER JOIN dbo.Prescription AS originalP ON originalP.PrescriptionId = pr.OriginalPrescriptionId
        INNER JOIN dbo.Prescription AS renewedP ON renewedP.PrescriptionId = pr.RenewedPrescriptionId
        WHERE pr.OriginalPrescriptionId = @PrescriptionId OR pr.RenewedPrescriptionId = @PrescriptionId
    ) AS Timeline
    ORDER BY ChangedDate ASC;
END
GO
