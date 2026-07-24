// A compact, always-fully-completed 5-step visual for one replacement event (shown
// inside ReplacementPrescriptionSummary right after a successful amendment) - distinct
// from the general PrescriptionTimeline (Prescription Details' own chronological list of
// every event across a prescription's whole life). All five steps did just happen, in
// this exact order, in the single usp_PrescriptionItem_Amend transaction that produced
// the result this component receives - there's no "in progress" state to represent.
const STEPS = [
  { key: 'created', label: 'Prescription Created', icon: 'bi-file-earmark-plus' },
  { key: 'updated', label: 'Medication Updated', icon: 'bi-pencil' },
  { key: 'superseded', label: 'Prescription Item Superseded', icon: 'bi-arrow-repeat' },
  { key: 'replacement', label: 'Replacement Prescription Created', icon: 'bi-file-earmark-medical' },
  { key: 'scid', label: 'New SCID Generated', icon: 'bi-upc-scan' },
];

function PrescriptionReplacementTimeline() {
  return (
    <ol className="list-unstyled mb-0">
      {STEPS.map((step) => (
        <li key={step.key} className="d-flex align-items-center gap-3 pb-2">
          <div
            className="text-bg-success rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
            style={{ width: '2rem', height: '2rem' }}
          >
            <i className={`bi ${step.icon}`} aria-hidden="true" />
          </div>
          <span className="fw-semibold">{step.label}</span>
          <i className="bi bi-check-circle-fill text-success ms-auto" aria-hidden="true" />
        </li>
      ))}
    </ol>
  );
}

export default PrescriptionReplacementTimeline;
