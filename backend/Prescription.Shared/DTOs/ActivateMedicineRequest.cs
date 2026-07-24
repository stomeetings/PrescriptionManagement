namespace Prescription.Shared.DTOs;

// Intentionally empty. Activate takes no request body - MedicineId comes from the route
// and UpdatedBy from the authenticated caller. Mirrors ActivatePatientRequest/
// ResetPasswordRequest's identical "no-body action" precedent.
public class ActivateMedicineRequest
{
}
