import { Fragment } from 'react';

function formatValue(value) {
  return value || value === 0 ? value : '—';
}

// Generic label/value block, reused for every section on the Patient Medication Details
// page (Patient Information, Medicine Information, Medication Details, Clinical
// Information, Audit Information) - mirrors MedicineInformationSection/
// PatientInformationSection's identical shape as its own component rather than
// importing across module boundaries (no single shared "DetailCard" component exists
// anywhere in this codebase - each module keeps its own copy, deliberately).
function PatientMedicationInformationSection({ title, items }) {
  return (
    <div className="card border-0 shadow-sm rounded-3">
      <div className="card-body">
        <h3 className="h6 text-uppercase text-muted mb-3">{title}</h3>
        <dl className="row mb-0">
          {items.map((item) => (
            <Fragment key={item.label}>
              <dt className="col-sm-4">{item.label}</dt>
              <dd className="col-sm-8">{formatValue(item.value)}</dd>
            </Fragment>
          ))}
        </dl>
      </div>
    </div>
  );
}

export default PatientMedicationInformationSection;
