namespace Prescription.Application.Prescriptions.Pdf;

public class PrescriptionPdfResult
{
    public byte[] PdfBytes { get; set; }

    // "PrescriptionNumber.pdf" (Step 18.6's own File Name requirement) - already
    // includes the .pdf extension.
    public string FileName { get; set; }

    // Derived count of PDF_GENERATED audit rows for this Prescription, including this
    // call - see 045_AlterPrescriptionAudit_AddPdfGeneratedAction.sql.
    public int DownloadCount { get; set; }
}
