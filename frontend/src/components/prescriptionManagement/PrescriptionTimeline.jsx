function formatDateTime(value) {
  return value ? new Date(value).toLocaleString() : '—';
}

// Maps the real event Action codes to display labels/icons - CREATED/UPDATED/
// PDF_GENERATED/RESTORED/FINALIZED come from PrescriptionAudit (CK_PrescriptionAudit_
// Action's only allowed values); REPRINTED comes from a second table,
// PrescriptionPrintHistory, unioned into the same timeline result set server-side
// (usp_Prescription_GetDetailsById) so this component doesn't need to know they're two
// different sources. "Edited" and "Version Created" from Step 18.7's own requested event
// list are the same underlying event in this system - every edit creates a new version
// in the same transaction - so UPDATED is shown once, labelled to cover both. There is
// still no plain PRINTED action (the original, non-reprint Print action never calls the
// backend - it's a pure browser contentWindow.print() against the already-loaded XHTML,
// Step 18.3) and no CANCELLED action (no Cancel capability exists yet) - neither is
// fabricated here. For REPRINTED, ChangedFields carries the reprint's own Reason text
// (e.g. "Lost Original") - the same field UPDATED already used for its changed-fields
// summary, reused here for a different purpose rather than adding a new response field.
const EVENT_META = {
  CREATED: { label: 'Draft Created', icon: 'bi-file-earmark-plus', variant: 'primary' },
  UPDATED: { label: 'Edited (New Version Created)', icon: 'bi-pencil', variant: 'secondary' },
  PDF_GENERATED: { label: 'PDF Generated', icon: 'bi-file-earmark-pdf', variant: 'info' },
  RESTORED: { label: 'Version Restored', icon: 'bi-arrow-counterclockwise', variant: 'warning' },
  FINALIZED: { label: 'Finalized', icon: 'bi-check2-circle', variant: 'success' },
  REPRINTED: { label: 'Reprinted', icon: 'bi-printer-fill', variant: 'primary' },
  AMENDED: { label: 'Medication Updated', icon: 'bi-pencil-square', variant: 'warning' },
  SUPERSEDED: { label: 'Prescription Item Superseded', icon: 'bi-arrow-repeat', variant: 'secondary' },
  REPLACEMENT_CREATED: { label: 'New SCID Generated', icon: 'bi-upc-scan', variant: 'success' },
  CREATED_AS_REPLACEMENT: { label: 'Replacement Prescription Created', icon: 'bi-file-earmark-medical', variant: 'primary' },
  // Prescription Renewal: one PrescriptionRenewal row surfaces as RENEWED on the
  // original prescription's own timeline and RENEWED_FROM on the renewed copy's -
  // ChangedFields carries the other prescription's own number for either direction (see
  // usp_Prescription_GetDetailsById's own comment). CREATED_AS_RENEWAL is the renewed
  // copy's own creation audit row (a third alternative to plain CREATED/
  // CREATED_AS_REPLACEMENT).
  RENEWED: { label: 'Prescription Renewed', icon: 'bi-arrow-clockwise', variant: 'primary' },
  RENEWED_FROM: { label: 'Renewed From', icon: 'bi-arrow-90deg-up', variant: 'secondary' },
  CREATED_AS_RENEWAL: { label: 'Renewal Draft Created', icon: 'bi-file-earmark-plus', variant: 'primary' },
  // Entire Prescription Cancellation: one PrescriptionAudit row (Action='CANCELLED'),
  // surfaced here via the Timeline's existing PrescriptionAudit UNION branch - no SQL
  // change was needed for this event to appear. ChangedFields carries the cancellation
  // Reason, reusing the same "subtitle" convention REPRINTED's Reason already uses.
  CANCELLED: { label: 'Prescription Cancelled', icon: 'bi-x-circle-fill', variant: 'danger' },
};

function PrescriptionTimeline({ events }) {
  return (
    <div className="card border-0 shadow-sm rounded-3 mb-3">
      <div className="card-header bg-white border-0 pt-3">
        <h2 className="h6 mb-0">Timeline</h2>
      </div>
      <div className="card-body">
        {events.length === 0 ? (
          <p className="text-muted mb-0">No history recorded yet.</p>
        ) : (
          <ol className="list-unstyled mb-0">
            {events.map((event, index) => {
              const meta = EVENT_META[event.action] || { label: event.action, icon: 'bi-circle', variant: 'secondary' };

              return (
                <li key={`${event.action}-${event.changedDate}-${index}`} className="d-flex gap-3 pb-3">
                  <div className={`text-bg-${meta.variant} rounded-circle d-flex align-items-center justify-content-center flex-shrink-0`} style={{ width: '2rem', height: '2rem' }}>
                    <i className={`bi ${meta.icon}`} aria-hidden="true" />
                  </div>
                  <div>
                    <div className="fw-semibold">
                      {meta.label}
                      {event.versionNumber && <span className="text-muted ms-1">(Version {event.versionNumber})</span>}
                    </div>
                    <div className="small text-muted">
                      {event.changedBy} · {formatDateTime(event.changedDate)}
                    </div>
                    {event.changedFields && (
                      <div className="small text-muted">
                        {event.action === 'REPRINTED' && 'Reason: '}
                        {event.action === 'CANCELLED' && 'Reason: '}
                        {event.action === 'RENEWED' && 'Renewed as: '}
                        {event.action === 'RENEWED_FROM' && 'Renewed from: '}
                        {!['REPRINTED', 'CANCELLED', 'RENEWED', 'RENEWED_FROM'].includes(event.action) && 'Changed: '}
                        {event.changedFields}
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        )}

        <div className="d-flex gap-3 text-muted">
          <div
            className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0 border"
            style={{ width: '2rem', height: '2rem' }}
          >
            <i className="bi bi-hourglass-split" aria-hidden="true" />
          </div>
          <div className="small fst-italic">NZePS events will appear here in a future release.</div>
        </div>
      </div>
    </div>
  );
}

export default PrescriptionTimeline;
