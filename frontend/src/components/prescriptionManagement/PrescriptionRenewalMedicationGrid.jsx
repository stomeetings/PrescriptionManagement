// "Display all active prescription items. Allow clinician to: renew all medications,
// renew selected medications only. Allow modification of: Quantity, Duration,
// Directions. Do not allow modification of: Medicine, Strength" - Medicine/Strength
// render as plain text (never an input), Dose/Frequency/Route likewise (this feature's
// own list only names Quantity/Duration/Directions as editable) - only those three
// fields are checked out of the read-only original values.
function PrescriptionRenewalMedicationGrid({ items, selections, onToggleItem, onToggleAll, onFieldChange }) {
  const activeItems = items.filter((item) => item.itemStatus === 'ACTIVE');
  const allSelected = activeItems.length > 0 && activeItems.every((item) => selections.has(item.prescriptionItemId));

  if (activeItems.length === 0) {
    return <p className="text-muted mb-0">This prescription has no active medications to renew.</p>;
  }

  return (
    <div className="table-responsive">
      <table className="table table-sm align-middle mb-0">
        <caption className="visually-hidden">Active medications available for renewal</caption>
        <thead className="table-light">
          <tr>
            <th scope="col">
              <input
                type="checkbox"
                className="form-check-input"
                checked={allSelected}
                onChange={() => onToggleAll(activeItems.map((item) => item.prescriptionItemId))}
                aria-label="Select all active medications"
              />
            </th>
            <th scope="col">Medicine</th>
            <th scope="col">Strength</th>
            <th scope="col">Dose</th>
            <th scope="col">Quantity</th>
            <th scope="col">Duration</th>
            <th scope="col">Directions</th>
          </tr>
        </thead>
        <tbody>
          {activeItems.map((item) => {
            const selection = selections.get(item.prescriptionItemId);
            const isSelected = Boolean(selection);

            return (
              <tr key={item.prescriptionItemId}>
                <td>
                  <input
                    type="checkbox"
                    className="form-check-input"
                    checked={isSelected}
                    onChange={() => onToggleItem(item)}
                    aria-label={`Select ${item.medicineName} for renewal`}
                  />
                </td>
                <td>{item.medicineName}</td>
                <td>{item.strength}</td>
                <td>
                  {item.dose} {item.doseUnit}
                </td>
                <td style={{ minWidth: '6rem' }}>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    className="form-control form-control-sm"
                    value={selection?.quantity ?? item.quantity}
                    onChange={(event) => onFieldChange(item.prescriptionItemId, 'quantity', Number(event.target.value))}
                    disabled={!isSelected}
                    aria-label={`Quantity for ${item.medicineName}`}
                  />
                </td>
                <td style={{ minWidth: '8rem' }}>
                  <div className="input-group input-group-sm">
                    <input
                      type="number"
                      min="0"
                      className="form-control"
                      value={selection?.duration ?? item.duration}
                      onChange={(event) => onFieldChange(item.prescriptionItemId, 'duration', Number(event.target.value))}
                      disabled={!isSelected}
                      aria-label={`Duration for ${item.medicineName}`}
                    />
                    <span className="input-group-text">{item.durationUnit}</span>
                  </div>
                </td>
                <td style={{ minWidth: '12rem' }}>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    value={selection?.instructions ?? item.instructions ?? ''}
                    onChange={(event) => onFieldChange(item.prescriptionItemId, 'instructions', event.target.value)}
                    disabled={!isSelected}
                    aria-label={`Directions for ${item.medicineName}`}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default PrescriptionRenewalMedicationGrid;
