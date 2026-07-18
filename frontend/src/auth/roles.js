// Mirrors backend/Prescription.Shared/Authorization/Roles.cs exactly - these are the
// literal Role.Code values embedded in the JWT "role" claim, not display labels.
export const ROLES = {
  SYSTEM_ADMINISTRATOR: 'SYSTEM_ADMINISTRATOR',
  DOCTOR: 'DOCTOR',
  PHARMACIST: 'PHARMACIST',
  RECEPTIONIST: 'RECEPTIONIST',
};

// No API endpoint exposes the Role table publicly (see database-spec.md / usp_Role_GetAll
// - only ever consumed internally by UserService). These labels mirror what's actually
// seeded in the database, not fabricated data. Shared here so UserToolbar's filter and
// CreateUserForm's dropdown don't each define their own copy.
export const ROLE_OPTIONS = [
  { code: ROLES.SYSTEM_ADMINISTRATOR, label: 'System Administrator' },
  { code: ROLES.DOCTOR, label: 'Doctor' },
  { code: ROLES.PHARMACIST, label: 'Pharmacist' },
  { code: ROLES.RECEPTIONIST, label: 'Receptionist' },
];
