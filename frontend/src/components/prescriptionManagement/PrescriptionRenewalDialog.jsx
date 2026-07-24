import { useEffect, useState } from 'react';
import PrescriptionRenewalMedicationGrid from './PrescriptionRenewalMedicationGrid.jsx';
import { getPrescriptionDetails, renewPrescription } from '../../api/prescriptionApi.js';
import { parseApiError } from '../../api/parseApiError.js';

// Self-contained like PrescriptionReprintDialog/PrescriptionVersionHistoryDialog -
// fetches the original prescription's own detail on open (for its active items), rather
// than requiring the caller to already have it, so this dialog works identically from
// the Details page or the List row.
function PrescriptionRenewalDialog({ show, prescriptionId, onRenewed, onClose }) {
  const [prescription, setPrescription] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState('');

  // Map<prescriptionItemId, { quantity, duration, instructions }> - presence in the map
  // is the "selected" flag; the values are the clinician's own (possibly edited) final
  // values for that item.
  const [selections, setSelections] = useState(new Map());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    if (!show) {
      return;
    }

    setSelections(new Map());
    setSubmitError('');
    setPrescription(null);
    setLoadError('');
    setIsLoading(true);

    getPrescriptionDetails(prescriptionId)
      .then((result) => {
        setPrescription(result);
        // "Renew all medications" is the default starting point - every active item
        // pre-selected with its own original values, so a doctor who wants everything
        // renewed unchanged only has to click Renew.
        const initial = new Map();
        result.medications
          .filter((item) => item.itemStatus === 'ACTIVE')
          .forEach((item) => {
            initial.set(item.prescriptionItemId, {
              quantity: item.quantity,
              duration: item.duration,
              instructions: item.instructions || '',
            });
          });
        setSelections(initial);
      })
      .catch((fetchError) => {
        const { generalMessage } = parseApiError(fetchError);
        setLoadError(generalMessage || 'Unable to load this prescription. Please try again.');
      })
      .finally(() => setIsLoading(false));
  }, [show, prescriptionId]);

  function handleToggleItem(item) {
    setSelections((current) => {
      const next = new Map(current);
      if (next.has(item.prescriptionItemId)) {
        next.delete(item.prescriptionItemId);
      } else {
        next.set(item.prescriptionItemId, {
          quantity: item.quantity,
          duration: item.duration,
          instructions: item.instructions || '',
        });
      }
      return next;
    });
  }

  function handleToggleAll(activeItemIds) {
    setSelections((current) => {
      const allSelected = activeItemIds.every((id) => current.has(id));
      if (allSelected) {
        return new Map();
      }

      const next = new Map();
      activeItemIds.forEach((id) => {
        const item = prescription.medications.find((medication) => medication.prescriptionItemId === id);
        next.set(id, {
          quantity: item.quantity,
          duration: item.duration,
          instructions: item.instructions || '',
        });
      });
      return next;
    });
  }

  function handleFieldChange(prescriptionItemId, field, value) {
    setSelections((current) => {
      const existing = current.get(prescriptionItemId);
      if (!existing) {
        return current;
      }
      const next = new Map(current);
      next.set(prescriptionItemId, { ...existing, [field]: value });
      return next;
    });
  }

  async function handleConfirm() {
    if (isSubmitting || selections.size === 0) {
      return;
    }

    setIsSubmitting(true);
    setSubmitError('');

    try {
      const selectedItems = Array.from(selections.entries()).map(([prescriptionItemId, values]) => ({
        prescriptionItemId,
        quantity: values.quantity,
        duration: values.duration,
        instructions: values.instructions,
      }));

      const result = await renewPrescription(prescriptionId, { selectedItems });
      onRenewed(result);
    } catch (renewError) {
      const { generalMessage } = parseApiError(renewError);
      setSubmitError(generalMessage || 'Unable to renew this prescription. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!show) {
    return null;
  }

  return (
    <>
      <div className="modal d-block" tabIndex="-1" role="dialog" aria-modal="true" aria-labelledby="prescriptionRenewalDialogTitle">
        <div className="modal-dialog modal-dialog-centered modal-lg" role="document">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title" id="prescriptionRenewalDialogTitle">
                Renew Prescription
              </h5>
              <button type="button" className="btn-close" onClick={onClose} aria-label="Close" disabled={isSubmitting} />
            </div>

            <div className="modal-body">
              {isLoading && (
                <div className="d-flex justify-content-center py-4">
                  <span className="spinner-border" role="status" aria-hidden="true" />
                  <span className="visually-hidden">Loading prescription…</span>
                </div>
              )}

              {!isLoading && loadError && (
                <div className="alert alert-danger mb-0" role="alert">
                  {loadError}
                </div>
              )}

              {!isLoading && !loadError && prescription && (
                <>
                  <p className="text-muted small">
                    Select the medications to renew and adjust Quantity, Duration, or Directions if needed. Medicine and
                    Strength cannot be changed.
                  </p>
                  <PrescriptionRenewalMedicationGrid
                    items={prescription.medications}
                    selections={selections}
                    onToggleItem={handleToggleItem}
                    onToggleAll={handleToggleAll}
                    onFieldChange={handleFieldChange}
                  />

                  {submitError && (
                    <div className="alert alert-danger mt-3 mb-0" role="alert">
                      {submitError}
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-outline-secondary" onClick={onClose} disabled={isSubmitting}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleConfirm}
                disabled={isSubmitting || isLoading || Boolean(loadError) || selections.size === 0}
              >
                {isSubmitting ? <span className="spinner-border spinner-border-sm me-1" aria-hidden="true" /> : null}
                Renew
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="modal-backdrop show" />
    </>
  );
}

export default PrescriptionRenewalDialog;
