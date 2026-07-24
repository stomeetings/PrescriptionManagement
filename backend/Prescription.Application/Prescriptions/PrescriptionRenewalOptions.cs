namespace Prescription.Application.Prescriptions;

// Bound from appsettings.json, mirroring ClinicOptions' identical pattern. "Cannot
// Renew: ... Expired (unless permitted by configuration)" - this is the configuration
// the task names; AllowExpiredRenewal defaults to false since nothing in this project
// currently sets a Prescription to EXPIRED anyway (no Expire action exists), so the
// default is the safe, conservative choice.
public class PrescriptionRenewalOptions
{
    public const string SectionName = "PrescriptionRenewal";

    public bool AllowExpiredRenewal { get; set; } = false;
}
