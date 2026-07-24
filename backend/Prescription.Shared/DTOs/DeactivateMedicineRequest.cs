namespace Prescription.Shared.DTOs;

// Intentionally empty. Deactivate takes no request body - MedicineId comes from the
// route and UpdatedBy from the authenticated caller. Mirrors ActivateMedicineRequest's
// identical precedent.
public class DeactivateMedicineRequest
{
}
