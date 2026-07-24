namespace Prescription.Application.Prescriptions.Templating;

// Renders a PrescriptionTemplateModel into a complete, self-contained XHTML document
// string (docs/prescriptions/prescription-management.md section 5.1/9) - used for
// browser preview, browser print, and (later) PDF generation from the same markup. The
// interface lives here (Application) so a future PrescriptionService can depend on it
// without referencing Infrastructure directly, matching this project's established
// Repository interface/implementation split.
public interface IPrescriptionHtmlGenerator
{
    string GenerateHtml(PrescriptionTemplateModel model);
}
