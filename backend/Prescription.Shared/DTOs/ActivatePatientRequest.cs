namespace Prescription.Shared.DTOs;

// Intentionally empty. Per the approved API spec (section 4.6), Activate takes no
// request body - PatientId comes from the route and UpdatedBy from the authenticated
// caller. This class exists because this step's requirements name it explicitly, mirroring
// ResetPasswordRequest's identical "no-body action" precedent from User Management.
public class ActivatePatientRequest
{
}
