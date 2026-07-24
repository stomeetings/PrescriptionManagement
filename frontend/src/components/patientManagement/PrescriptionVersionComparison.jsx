function ItemSummary({ item }) {
  return (
    <>
      <span className="fw-semibold">{item.medicineName}</span>{' '}
      <span className="text-muted small">
        {item.dose} {item.doseUnit} — {item.frequency} — Qty {item.quantity}
      </span>
      {item.instructions && <div className="small text-muted">{item.instructions}</div>}
    </>
  );
}

function AddedOrRemovedItem({ item, indicator, badgeClass }) {
  return (
    <li className="list-group-item">
      <span className={`badge ${badgeClass} me-2`}>{indicator}</span>
      <ItemSummary item={item} />
    </li>
  );
}

function ChangedItem({ change }) {
  return (
    <li className="list-group-item">
      <span className="badge text-bg-warning me-2">✏</span>
      <span className="fw-semibold">{change.after.medicineName}</span>
      <span className="text-muted small ms-2">Changed: {change.changedFields.join(', ')}</span>
      <div className="row mt-2 small">
        <div className="col-6">
          <div className="text-muted">Before</div>
          <ItemSummary item={change.before} />
        </div>
        <div className="col-6">
          <div className="text-muted">After</div>
          <ItemSummary item={change.after} />
        </div>
      </div>
    </li>
  );
}

// Renders a PrescriptionVersionComparisonResponse - already fully diffed server-side by
// PrescriptionVersionService.CompareAsync (see that file's own comment for why this
// isn't a stored procedure) - so this component only applies +/-/✏ badges to lists the
// backend already categorized. No further diffing happens in React.
function PrescriptionVersionComparison({ comparison, isLoading, error }) {
  if (isLoading) {
    return (
      <div className="d-flex justify-content-center py-4">
        <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
        <span className="visually-hidden">Comparing versions…</span>
      </div>
    );
  }

  if (error) {
    return <div className="alert alert-danger mb-0">{error}</div>;
  }

  if (!comparison) {
    return <p className="text-muted mb-0">Select two versions to compare them.</p>;
  }

  const hasMedicationChanges =
    comparison.medicationsAdded.length > 0 || comparison.medicationsRemoved.length > 0 || comparison.medicationsChanged.length > 0;

  return (
    <div>
      <h6 className="mb-3">
        Comparing Version {comparison.fromVersionNumber} → Version {comparison.toVersionNumber}
      </h6>

      {comparison.clinicalNotesChanged && (
        <div className="alert alert-warning py-2">
          <span className="badge text-bg-warning me-2">✏</span>
          Clinical Notes changed
          <div className="row mt-2 small">
            <div className="col-6">
              <div className="text-muted">Before</div>
              <div>{comparison.fromClinicalNotes || '—'}</div>
            </div>
            <div className="col-6">
              <div className="text-muted">After</div>
              <div>{comparison.toClinicalNotes || '—'}</div>
            </div>
          </div>
        </div>
      )}

      {!comparison.clinicalNotesChanged && !hasMedicationChanges && (
        <p className="text-muted">No changes between these two versions.</p>
      )}

      {comparison.medicationsAdded.length > 0 && (
        <ul className="list-group mb-3">
          {comparison.medicationsAdded.map((item) => (
            <AddedOrRemovedItem key={`added-${item.medicineId}`} item={item} indicator="+" badgeClass="text-bg-success" />
          ))}
        </ul>
      )}

      {comparison.medicationsRemoved.length > 0 && (
        <ul className="list-group mb-3">
          {comparison.medicationsRemoved.map((item) => (
            <AddedOrRemovedItem key={`removed-${item.medicineId}`} item={item} indicator="−" badgeClass="text-bg-danger" />
          ))}
        </ul>
      )}

      {comparison.medicationsChanged.length > 0 && (
        <ul className="list-group mb-3">
          {comparison.medicationsChanged.map((change) => (
            <ChangedItem key={`changed-${change.after.medicineId}`} change={change} />
          ))}
        </ul>
      )}
    </div>
  );
}

export default PrescriptionVersionComparison;
