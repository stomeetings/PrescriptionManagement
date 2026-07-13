// Mirrors backend/Prescription.Shared/Authorization/Roles.cs exactly - these are the
// literal Role.Code values embedded in the JWT "role" claim, not display labels.
export const ROLES = {
  SYSTEM_ADMINISTRATOR: 'SYSTEM_ADMINISTRATOR',
  DOCTOR: 'DOCTOR',
  PHARMACIST: 'PHARMACIST',
  RECEPTIONIST: 'RECEPTIONIST',
};
