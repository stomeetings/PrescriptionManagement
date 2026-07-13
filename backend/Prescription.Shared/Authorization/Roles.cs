namespace Prescription.Shared.Authorization;

// Centralized role-code constants, matching Role.Code exactly as seeded in the database
// and embedded in the JWT "role" claim (docs/authentication/database-spec.md section 14,
// docs/authentication/api-spec.md section 3.2). Controllers must reference these constants
// in [Authorize(Roles = ...)] rather than retyping role strings, so a typo can't silently
// produce an authorization rule that matches nobody.
public static class Roles
{
    public const string SystemAdministrator = "SYSTEM_ADMINISTRATOR";
    public const string Doctor = "DOCTOR";
    public const string Pharmacist = "PHARMACIST";
    public const string Receptionist = "RECEPTIONIST";
}
