namespace Prescription.Shared.DTOs;

// The prescribing clinician - the authenticated caller who generated the draft
// (docs/prescriptions/prescription-management.md section 15 item 5: "assumed to be the
// authenticated caller"). NzmcNumber/Address are not included - UserAccount has no such
// fields (no NZ Medical Council registration number or address column exists anywhere
// in this schema); adding them here would fabricate data no caller actually supplies.
public class PrescriptionProviderResponse
{
    public int UserAccountId { get; set; }
    public string FullName { get; set; }
    public string Email { get; set; }
    public string PhoneNumber { get; set; }
}
