import './common.css';

/**
 * Spinner — full-page or inline loading indicator
 * @param {boolean} fullPage - If true, centers in viewport
 * @param {number} size - px size of spinner ring
 */
export function Spinner({ fullPage = false, size = 36 }) {
  const ring = (
    <div
      className="spinner-ring"
      style={{ width: size, height: size }}
      role="status"
      aria-label="Loading"
    />
  );

  if (fullPage) {
    return <div className="spinner-fullpage">{ring}</div>;
  }

  return <div className="spinner-inline">{ring}</div>;
}

/**
 * EmptyState — zero-data placeholder
 * @param {React.ReactNode} icon
 * @param {string} title
 * @param {string} [description]
 * @param {React.ReactNode} [action]
 */
export function EmptyState({ icon, title, description, action }) {
  return (
    <div className="empty-state">
      {icon && <div className="empty-state-icon">{icon}</div>}
      <h3 className="empty-state-title">{title}</h3>
      {description && <p className="empty-state-desc">{description}</p>}
      {action && <div className="empty-state-action">{action}</div>}
    </div>
  );
}
