import Breadcrumb from './Breadcrumb.jsx';

// Every routed page (Dashboard, and every ComingSoonPage placeholder) wraps its
// content in this for consistent spacing/heading, rather than each page rebuilding
// its own header block.
function PageContainer({ title, children }) {
  return (
    <div className="container-fluid p-3 p-md-4">
      <div className="mb-3">
        <Breadcrumb />
        <h1 className="h3 mt-2 mb-0">{title}</h1>
      </div>

      {children}
    </div>
  );
}

export default PageContainer;
