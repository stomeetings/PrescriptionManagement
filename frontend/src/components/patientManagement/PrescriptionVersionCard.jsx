function formatDateTime(value) {
  return value ? new Date(value).toLocaleString() : '—';
}

// One row within PrescriptionVersionTimeline - display + selection only, no API calls of
// its own (the History Dialog owns all fetching, per this step's own "load history on
// demand, lazy load comparisons" performance requirement).
function PrescriptionVersionCard({ version, isSelected, isCurrent, onToggleSelect }) {
  function handleCheckboxClick(event) {
    // The checkbox already toggles selection via onChange - without this, clicking it
    // would also bubble to the row's own onClick and toggle a second time, cancelling
    // the first toggle out.
    event.stopPropagation();
  }

  return (
    <div
      className={`list-group-item list-group-item-action d-flex justify-content-between align-items-start gap-2 ${isSelected ? 'active' : ''}`}
      role="button"
      tabIndex="0"
      onClick={() => onToggleSelect(version.versionNumber)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onToggleSelect(version.versionNumber);
        }
      }}
    >
      <div>
        <div className="d-flex align-items-center gap-2 flex-wrap">
          <span className="fw-semibold">Version {version.versionNumber}</span>
          {isCurrent && <span className="badge text-bg-primary">Current</span>}
          <span className="badge rounded-pill text-bg-secondary">
            {version.status?.displayText || version.status?.code || '—'}
          </span>
        </div>
        <div className="small">{version.changeSummary || 'No tracked fields changed'}</div>
        <div className="small text-muted">
          Saved by {version.savedBy || '—'} on {formatDateTime(version.savedDate)}
        </div>
      </div>
      <input
        type="checkbox"
        className="form-check-input mt-1"
        checked={isSelected}
        onChange={() => onToggleSelect(version.versionNumber)}
        onClick={handleCheckboxClick}
        aria-label={`Select Version ${version.versionNumber} for comparison`}
      />
    </div>
  );
}

export default PrescriptionVersionCard;
