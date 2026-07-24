using System.Globalization;
using System.Reflection;
using System.Security;
using System.Text;
using Prescription.Application.Prescriptions.Templating;

namespace Prescription.Infrastructure.Prescriptions.Templating;

// Renders PrescriptionTemplate.xhtml + PrescriptionStyle.css (embedded resources,
// Assets/ folder) against a PrescriptionTemplateModel using simple, dependency-free
// {{Token}} substitution - no Razor/Scriban/third-party templating engine, since the
// task's own file list names only these four artifacts. XHTML structure/styling lives
// entirely in the two asset files; this class only ever does token replacement and the
// two structural transforms (medication row repeat, clinical-notes show/hide) - it never
// builds a <tag> by hand, keeping "Separate XHTML from C# logic" real rather than
// nominal.
//
// Stateless and side-effect-free (reads two fixed embedded resources, does string
// substitution, returns a new string) - registered as a Singleton (see
// DependencyInjection.cs), with the loaded template/stylesheet text cached after first
// use since embedded resource content never changes at runtime.
public class PrescriptionHtmlGenerator : IPrescriptionHtmlGenerator
{
    private const string TemplateResourceName = "Prescription.Infrastructure.Prescriptions.Templating.Assets.PrescriptionTemplate.xhtml";
    private const string StyleResourceName = "Prescription.Infrastructure.Prescriptions.Templating.Assets.PrescriptionStyle.css";

    private const string MedicationRowStartMarker = "<!-- MEDICATION_ROW_TEMPLATE_START -->";
    private const string MedicationRowEndMarker = "<!-- MEDICATION_ROW_TEMPLATE_END -->";
    private const string ClinicalNotesStartMarker = "<!-- CLINICAL_NOTES_SECTION_START -->";
    private const string ClinicalNotesEndMarker = "<!-- CLINICAL_NOTES_SECTION_END -->";

    private static readonly Lazy<string> TemplateText = new(() => ReadEmbeddedResource(TemplateResourceName));
    private static readonly Lazy<string> StyleText = new(() => ReadEmbeddedResource(StyleResourceName));

    public string GenerateHtml(PrescriptionTemplateModel model)
    {
        var html = TemplateText.Value;

        html = html.Replace("{{StyleSheet}}", StyleText.Value);

        html = ReplaceMedicationRows(html, model.Medications);
        html = ReplaceClinicalNotesSection(html, model.ClinicalNotes);

        html = ReplaceToken(html, "ClinicName", model.Clinic?.Name);
        html = ReplaceToken(html, "ClinicAddress", model.Clinic?.Address);
        html = ReplaceToken(html, "ClinicPhone", model.Clinic?.Phone);
        html = ReplaceToken(html, "ClinicEmail", model.Clinic?.Email);

        html = ReplaceToken(html, "ProviderName", model.Provider?.Name);
        html = ReplaceToken(html, "ProviderNzmcNumber", model.Provider?.NzmcNumber);
        html = ReplaceToken(html, "ProviderAddress", model.Provider?.Address);
        html = ReplaceToken(html, "ProviderPhone", model.Provider?.Phone);
        html = ReplaceToken(html, "ProviderEmail", model.Provider?.Email);

        html = ReplaceToken(html, "PatientName", model.Patient?.Name);
        html = ReplaceToken(html, "PatientNhiNumber", model.Patient?.NhiNumber);
        html = ReplaceToken(html, "PatientDateOfBirth", FormatDate(model.Patient?.DateOfBirth));
        html = ReplaceToken(html, "PatientGender", model.Patient?.Gender);
        html = ReplaceToken(html, "PatientAddress", model.Patient?.Address);
        html = ReplaceToken(html, "PatientPhone", model.Patient?.Phone);

        html = ReplaceToken(html, "PrescriptionNumber", model.Prescription?.PrescriptionNumber);
        html = ReplaceToken(html, "IssueDate", FormatDate(model.Prescription?.IssueDate));
        html = ReplaceToken(html, "ExpiryDate", FormatDate(model.Prescription?.ExpiryDate));
        html = ReplaceToken(html, "PrescriptionStatus", model.Prescription?.Status);

        html = ReplaceToken(html, "BarcodeBars", BuildBarcodeBars(model.Prescription?.PrescriptionNumber), escape: false);

        // Doctor Signature block reuses Provider identity (docs/prescriptions/
        // prescription-management.md section 15 item 5: the prescribing provider is the
        // only clinician in view) and today's date - a future PrescriptionService would
        // pass the actual issue date through PrescriptionHeaderDetails.IssueDate instead
        // if a distinct "signed date" concept is ever needed.
        html = ReplaceToken(html, "DoctorName", model.Provider?.Name);
        html = ReplaceToken(html, "DoctorDesignation", "Prescriber");
        html = ReplaceToken(html, "SignatureDate", FormatDate(model.Prescription?.IssueDate));

        return html;
    }

    private static string ReplaceMedicationRows(string html, IReadOnlyList<PrescriptionMedicationLine> medications)
    {
        var rowTemplate = ExtractBetweenMarkers(html, MedicationRowStartMarker, MedicationRowEndMarker);

        var rows = new StringBuilder();
        foreach (var medication in medications ?? Array.Empty<PrescriptionMedicationLine>())
        {
            var row = rowTemplate;
            row = ReplaceToken(row, "Row.MedicineName", medication.MedicineName);
            row = ReplaceToken(row, "Row.Strength", medication.Strength);
            row = ReplaceToken(row, "Row.Dose", medication.Dose);
            row = ReplaceToken(row, "Row.Frequency", medication.Frequency);
            row = ReplaceToken(row, "Row.Route", medication.Route);
            row = ReplaceToken(row, "Row.Quantity", medication.Quantity);
            row = ReplaceToken(row, "Row.Directions", medication.Directions);
            rows.Append(row);
        }

        return ReplaceBlock(html, MedicationRowStartMarker, MedicationRowEndMarker, rows.ToString());
    }

    private static string ReplaceClinicalNotesSection(string html, string clinicalNotes)
    {
        // "Display if present. Hide the section when empty." (business spec section
        // 5.1) - an empty/whitespace-only value removes the whole marked section,
        // including its heading, rather than leaving a blank box in the document.
        var replacement = string.IsNullOrWhiteSpace(clinicalNotes)
            ? string.Empty
            : ExtractBetweenMarkers(html, ClinicalNotesStartMarker, ClinicalNotesEndMarker)
                .Replace("{{ClinicalNotes}}", EscapeXhtml(clinicalNotes));

        return ReplaceBlock(html, ClinicalNotesStartMarker, ClinicalNotesEndMarker, replacement);
    }

    // Dummy/placeholder Code128-style bar rendering (docs/prescriptions/
    // prescription-management.md Step 18.1: "Generate a barcode placeholder from
    // Prescription Number. Do not integrate NZePS barcode yet.") - deterministic from
    // the input text so the same Prescription Number always renders the same bars, but
    // this is NOT a real, scannable Code128 encoding. All widths come from
    // PrescriptionStyle.css classes (barcode-bar-0..3) - no inline styles, per this
    // step's own requirement.
    private static string BuildBarcodeBars(string prescriptionNumber)
    {
        if (string.IsNullOrEmpty(prescriptionNumber))
        {
            return string.Empty;
        }

        var bars = new StringBuilder();
        foreach (var character in prescriptionNumber)
        {
            var widthBucket = character % 4;
            bars.Append("<span class=\"barcode-bar barcode-bar-").Append(widthBucket).Append("\"></span>");
        }

        return bars.ToString();
    }

    private static string ReplaceToken(string html, string tokenName, string value, bool escape = true)
    {
        var token = "{{" + tokenName + "}}";
        var safeValue = string.IsNullOrEmpty(value) ? "-" : (escape ? EscapeXhtml(value) : value);
        return html.Replace(token, safeValue);
    }

    // Every clinical/patient/provider value is caller-supplied text, not markup - it
    // must be XML-escaped both to keep the output well-formed XHTML (an unescaped "&" or
    // "<" in, say, a patient's address would break the document) and to prevent markup
    // injection into a document that may later be printed, converted to PDF, or
    // transmitted to NZePS.
    private static string EscapeXhtml(string value) => SecurityElement.Escape(value);

    private static string FormatDate(DateTime? value)
        => value.HasValue ? value.Value.ToString("dd MMM yyyy", CultureInfo.InvariantCulture) : null;

    private static string ExtractBetweenMarkers(string html, string startMarker, string endMarker)
    {
        var startIndex = html.IndexOf(startMarker, StringComparison.Ordinal) + startMarker.Length;
        var endIndex = html.IndexOf(endMarker, StringComparison.Ordinal);
        return html[startIndex..endIndex];
    }

    private static string ReplaceBlock(string html, string startMarker, string endMarker, string replacement)
    {
        var startIndex = html.IndexOf(startMarker, StringComparison.Ordinal);
        var endIndex = html.IndexOf(endMarker, StringComparison.Ordinal) + endMarker.Length;
        return html[..startIndex] + replacement + html[endIndex..];
    }

    private static string ReadEmbeddedResource(string resourceName)
    {
        var assembly = Assembly.GetExecutingAssembly();
        using var stream = assembly.GetManifestResourceStream(resourceName)
            ?? throw new InvalidOperationException($"Embedded resource '{resourceName}' was not found. Confirm it is included as an EmbeddedResource in Prescription.Infrastructure.csproj.");
        using var reader = new StreamReader(stream, Encoding.UTF8);
        return reader.ReadToEnd();
    }
}
