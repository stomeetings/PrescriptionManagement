// Read-only display of the medicine chosen via MedicineSearchDialog - the clinician
// never types these fields (this task's own hard requirement). "Change Medicine" is only
// offered when allowChange is true: MedicineId is immutable once a Patient Medication is
// created (api-spec.md section 4.7 - "no patientId/medicineId fields at all" on Update),
// so PatientMedicationForm never allows this in edit mode.
function SelectedMedicineCard({ medicine, allowChange, onChangeMedicine }) {
  if (!medicine) {
    return null;
  }

  return (
    <div className="card border-0 bg-light rounded-3 mb-3">
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-start mb-3">
          <h2 className="h6 text-uppercase text-muted mb-0">Selected Medicine</h2>
          {allowChange && (
            <button type="button" className="btn btn-sm btn-outline-secondary" onClick={onChangeMedicine}>
              <i className="bi bi-arrow-repeat me-1" aria-hidden="true" />
              Change Medicine
            </button>
          )}
        </div>

        <div className="row g-3">
          <div className="col-12 col-md-3">
            <label className="form-label">Medicine Code</label>
            <input type="text" className="form-control" value={medicine.medicineCode} readOnly disabled />
          </div>
          <div className="col-12 col-md-5">
            <label className="form-label">Medicine Name</label>
            <input type="text" className="form-control" value={medicine.medicineName} readOnly disabled />
          </div>
          <div className="col-12 col-md-4">
            <label className="form-label">Generic Name</label>
            <input type="text" className="form-control" value={medicine.genericName} readOnly disabled />
          </div>

          <div className="col-12 col-md-3">
            <label className="form-label">Brand Name</label>
            <input type="text" className="form-control" value={medicine.brandName || '—'} readOnly disabled />
          </div>
          <div className="col-12 col-md-3">
            <label className="form-label">Strength</label>
            <input type="text" className="form-control" value={medicine.strength} readOnly disabled />
          </div>
          <div className="col-12 col-md-3">
            <label className="form-label">Dosage Form</label>
            <input type="text" className="form-control" value={medicine.medicineForm?.displayText || ''} readOnly disabled />
          </div>
          <div className="col-12 col-md-3">
            <label className="form-label">Route</label>
            <input type="text" className="form-control" value={medicine.medicineRoute?.displayText || ''} readOnly disabled />
          </div>

          <div className="col-12 col-md-4">
            <label className="form-label">Manufacturer</label>
            <input type="text" className="form-control" value={medicine.manufacturer || '—'} readOnly disabled />
          </div>
        </div>
      </div>
    </div>
  );
}

export default SelectedMedicineCard;
