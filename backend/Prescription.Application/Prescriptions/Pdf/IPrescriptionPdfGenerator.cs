namespace Prescription.Application.Prescriptions.Pdf;

// Converts an already-rendered XHTML string (the exact same document
// IPrescriptionHtmlGenerator produces and the browser preview/print already use - Steps
// 18.1-18.3) into PDF bytes. Never touches the template itself - "Do not duplicate the
// XHTML template" (Step 18.6's own requirement) - it only ever consumes the finished
// document. Interface lives in Application so a future PrescriptionPdfService depends on
// it without referencing Infrastructure directly, matching IPrescriptionHtmlGenerator's
// identical split.
public interface IPrescriptionPdfGenerator
{
    Task<byte[]> GeneratePdfAsync(string xhtml);
}
