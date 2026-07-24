-- Records a reprint event. No business-rule validation here (existence/not-Draft/not-
-- Cancelled/Xhtml-present) - that all lives in PrescriptionReprintService, using the
-- already-existing IPrescriptionRepository.GetByIdAsync (no need to duplicate those
-- checks in SQL too). VersionPrinted is computed here, not passed in, so it always
-- reflects the true current version at the moment this row is written, not a value the
-- caller fetched slightly earlier. Mirrors usp_Prescription_LogPdfGenerated's identical
-- "simple insert + derived count" shape.
CREATE OR ALTER PROCEDURE dbo.usp_Prescription_Reprint
    @PrescriptionId INT,
    @Reason NVARCHAR(500),
    @CopyCount INT,
    @PrintedBy NVARCHAR(100)
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @VersionPrinted INT;
    SELECT @VersionPrinted = MAX(VersionNumber) FROM dbo.PrescriptionVersion WHERE PrescriptionId = @PrescriptionId;

    DECLARE @PrintedDate DATETIME2 = SYSUTCDATETIME();

    INSERT INTO dbo.PrescriptionPrintHistory (PrescriptionId, PrintType, Reason, CopyCount, VersionPrinted, PrintedBy, PrintedDate)
    VALUES (@PrescriptionId, 'REPRINTED', @Reason, @CopyCount, @VersionPrinted, @PrintedBy, @PrintedDate);

    DECLARE @PrintCount INT;
    SELECT @PrintCount = COUNT(*) FROM dbo.PrescriptionPrintHistory WHERE PrescriptionId = @PrescriptionId;

    SELECT
        @PrintCount AS PrintCount,
        @PrintedDate AS PrintedDate,
        @PrintedBy AS PrintedBy,
        @VersionPrinted AS VersionPrinted;
END
GO
