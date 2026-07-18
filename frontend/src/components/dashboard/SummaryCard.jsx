function SummaryCard({ label, value, icon, accent = 'primary' }) {
  return (
    <div className="card border-0 shadow-sm rounded-3 h-100">
      <div className="card-body d-flex align-items-center gap-3">
        <div
          className={`d-flex align-items-center justify-content-center rounded-circle bg-${accent}-subtle text-${accent}`}
          style={{ width: 48, height: 48 }}
        >
          <i className={`bi ${icon} fs-4`} aria-hidden="true" />
        </div>
        <div>
          <div className="fs-4 fw-semibold lh-1">{value}</div>
          <div className="text-muted small">{label}</div>
        </div>
      </div>
    </div>
  );
}

export default SummaryCard;
