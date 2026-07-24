namespace Prescription.Application.Prescriptions;

// Bound from appsettings.json (mirrors JwtOptions' pattern) rather than hardcoded in
// PrescriptionTemplateModel-building code - there is no Clinic entity/table anywhere in
// this project, and inventing one is out of scope for this step's "small wiring" only;
// this is the minimal way to avoid literal magic strings in C#.
public class ClinicOptions
{
    public const string SectionName = "Clinic";

    public string Name { get; set; }
    public string Address { get; set; }
    public string Phone { get; set; }
    public string Email { get; set; }
}
