function getInitials(medicineName) {
  if (!medicineName) {
    return '?';
  }

  const initials = medicineName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

  return initials || '?';
}

function MedicineProfileCard({ medicine }) {
  return (
    <div className="card border-0 shadow-sm rounded-3">
      <div className="card-body text-center py-4">
        <div
          className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center mx-auto mb-3"
          style={{ width: 80, height: 80, fontSize: '1.75rem', fontWeight: 600 }}
        >
          {getInitials(medicine.medicineName)}
        </div>

        <h2 className="h5 mb-1">{medicine.medicineName}</h2>
        <p className="text-muted mb-3">{medicine.medicineCode}</p>

        <div className="d-flex justify-content-center flex-wrap gap-2">
          {medicine.isControlledDrug && <span className="badge rounded-pill text-bg-danger">Controlled Drug</span>}
          <span className={`badge rounded-pill text-bg-${medicine.isActive ? 'success' : 'secondary'}`}>
            {medicine.isActive ? 'Active' : 'Inactive'}
          </span>
        </div>
      </div>
    </div>
  );
}

export default MedicineProfileCard;
