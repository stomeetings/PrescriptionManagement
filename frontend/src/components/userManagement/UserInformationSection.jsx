import { Fragment } from 'react';

function formatValue(value) {
  return value || value === 0 ? value : '—';
}

// Generic label/value block, reused for both "General Information" and "Account
// Information" (see UserDetailsPage) rather than building two near-identical
// components for what's really the same layout with different data.
function UserInformationSection({ title, items }) {
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

export default UserInformationSection;
