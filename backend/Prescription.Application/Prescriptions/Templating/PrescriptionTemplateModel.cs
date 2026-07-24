namespace Prescription.Application.Prescriptions.Templating;

// The sole input to IPrescriptionHtmlGenerator.GenerateHtml - a flat, presentation-only
// model. Not a Domain entity and not a wire DTO: it exists only to carry every value the
// XHTML template needs, so PrescriptionHtmlGenerator never hardcodes clinical/patient/
// provider data (docs/prescriptions/prescription-management.md Step 18.1's own "Do not
// hardcode values" requirement). Whoever builds this model (a future PrescriptionService)
// is responsible for populating it from already-snapshotted PrescriptionItem data, per
// the approved spec's snapshot-not-live-reference decision (section 5.3) - this class
// itself has no opinion on where its values came from.
public class PrescriptionTemplateModel
{
    public PrescriptionClinicDetails Clinic { get; set; }
    public PrescriptionProviderDetails Provider { get; set; }
    public PrescriptionPatientDetails Patient { get; set; }
    public PrescriptionHeaderDetails Prescription { get; set; }
    public IReadOnlyList<PrescriptionMedicationLine> Medications { get; set; }

    // Null/empty means "no clinical notes" - the template hides the whole section in
    // that case (business spec section 5.1: "Display if present. Hide the section when
    // empty.").
    public string ClinicalNotes { get; set; }
}

public class PrescriptionClinicDetails
{
    public string Name { get; set; }
    public string Address { get; set; }
    public string Phone { get; set; }
    public string Email { get; set; }
}

public class PrescriptionProviderDetails
{
    public string Name { get; set; }
    public string NzmcNumber { get; set; }
    public string Address { get; set; }
    public string Phone { get; set; }
    public string Email { get; set; }
}

public class PrescriptionPatientDetails
{
    public string Name { get; set; }

    // Nullable by name (NHI is optional per business/database precedent elsewhere in
    // this project) - the template shows "-" when absent, never a blank/broken layout.
    public string NhiNumber { get; set; }
    public DateTime DateOfBirth { get; set; }
    public string Gender { get; set; }
    public string Address { get; set; }
    public string Phone { get; set; }
}

public class PrescriptionHeaderDetails
{
    public string PrescriptionNumber { get; set; }
    public DateTime IssueDate { get; set; }
    public DateTime? ExpiryDate { get; set; }
    public string Status { get; set; }
}

// One row in the medication table (business spec section 5.1 / Step 18.1's own column
// list). Deliberately flat strings, not domain entities - by the time this model is
// built, every value has already been resolved/snapshotted (Medicine name, lookup
// DisplayText values, etc.) since the template layer must never reach back into the
// database or the Domain layer itself.
public class PrescriptionMedicationLine
{
    public string MedicineName { get; set; }
    public string Strength { get; set; }
    public string Dose { get; set; }
    public string Frequency { get; set; }
    public string Route { get; set; }
    public string Quantity { get; set; }
    public string Directions { get; set; }
}
