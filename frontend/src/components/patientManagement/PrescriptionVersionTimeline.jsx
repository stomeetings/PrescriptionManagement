import PrescriptionVersionCard from './PrescriptionVersionCard.jsx';

// Read-only list of every saved version, newest first (the backend already orders this
// way - no client-side sorting here). Selection state (for Compare) is owned by the
// parent History Dialog, not this component - PrescriptionVersionCard just reports
// clicks upward.
function PrescriptionVersionTimeline({ versions, isLoading, error, onRetry, selectedVersions, onToggleSelect, currentVersionNumber }) {
  if (isLoading) {
    return (
      <div className="d-flex justify-content-center align-items-center py-5">
        <span className="spinner-border" role="status" aria-hidden="true" />
        <span className="visually-hidden">Loading version history…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-danger d-flex justify-content-between align-items-center">
        <span>{error}</span>
        <button type="button" className="btn btn-sm btn-outline-danger" onClick={onRetry}>
          Retry
        </button>
      </div>
    );
  }

  if (!versions || versions.length === 0) {
    return <p className="text-muted mb-0">No versions have been saved yet.</p>;
  }

  return (
    <div className="list-group">
      {versions.map((version) => (
        <PrescriptionVersionCard
          key={version.versionNumber}
          version={version}
          isSelected={selectedVersions.includes(version.versionNumber)}
          isCurrent={version.versionNumber === currentVersionNumber}
          onToggleSelect={onToggleSelect}
        />
      ))}
    </div>
  );
}

export default PrescriptionVersionTimeline;
