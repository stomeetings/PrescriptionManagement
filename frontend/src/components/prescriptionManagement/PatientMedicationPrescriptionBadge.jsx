// Patient Medication List's own icon set. Only NEVER_PRESCRIBED/CURRENTLY_PRESCRIBED/
// SUPERSEDED are ever actually produced (usp_PatientMedication_GetCurrent's own computed
// PrescriptionLinkStatus column) - COMPLETED/CANCELLED are defined here for
// schema-completeness (matching how CANCELLED/DISPENSED already sit unreachable in
// PrescriptionStatus) since no Dispense/Cancel action exists yet to ever produce them.
const STATUS_META = {
  NEVER_PRESCRIBED: { label: 'Never Prescribed', icon: 'bi-dash-circle', variant: 'secondary' },
  CURRENTLY_PRESCRIBED: { label: 'Currently Prescribed', icon: 'bi-check-circle-fill', variant: 'success' },
  SUPERSEDED: { label: 'Superseded', icon: 'bi-arrow-repeat', variant: 'secondary' },
  COMPLETED: { label: 'Completed', icon: 'bi-flag-fill', variant: 'primary' },
  CANCELLED: { label: 'Cancelled', icon: 'bi-x-circle-fill', variant: 'dark' },
};

function PatientMedicationPrescriptionBadge({ status }) {
  const meta = STATUS_META[status];

  if (!meta) {
    return null;
  }

  return (
    <span className={`badge rounded-pill text-bg-${meta.variant}`} title={meta.label}>
      <i className={`bi ${meta.icon} me-1`} aria-hidden="true" />
      {meta.label}
    </span>
  );
}

export default PatientMedicationPrescriptionBadge;
