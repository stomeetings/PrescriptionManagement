namespace Prescription.Shared.DTOs;

// Intentionally empty. Per the approved API spec (section 4.7), Deactivate takes no
// request body - PatientId comes from the route and UpdatedBy from the authenticated
// caller. Mirrors ActivatePatientRequest/ResetPasswordRequest's identical precedent.
public class DeactivatePatientRequest
{
}
