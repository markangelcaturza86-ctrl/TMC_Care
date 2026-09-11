const STATUS_STYLES = {
  // neutral / info
  Submitted: { bg: '#E7EEFD', color: '#2F6FED' },
  Pending: { bg: '#FEF3C7', color: '#B45309' },
  'Under Review': { bg: '#FEF3C7', color: '#B45309' },
  'Under Verification': { bg: '#FEF3C7', color: '#B45309' },
  Investigating: { bg: '#FEE7DC', color: '#C2410C' },
  'Additional Documents': { bg: '#FEF9C3', color: '#A16207' },
  // positive
  Approved: { bg: '#DCFCE7', color: '#15803D' },
  'Partially Approved': { bg: '#EDE9FE', color: '#6D28D9' },
  Resolved: { bg: '#DCFCE7', color: '#15803D' },
  Verified: { bg: '#DCFCE7', color: '#15803D' },
  Active: { bg: '#DCFCE7', color: '#15803D' },
  'Assistance Released': { bg: '#CCFBF1', color: '#0F766E' },
  // negative
  Declined: { bg: '#FEE2E2', color: '#B91C1C' },
  Dismissed: { bg: '#FEE2E2', color: '#B91C1C' },
  Rejected: { bg: '#FEE2E2', color: '#B91C1C' },
  Inactive: { bg: '#F1F2F6', color: '#6B7280' },
  Unassigned: { bg: '#F1F2F6', color: '#6B7280' },
};

const PRIORITY_STYLES = {
  Low: { bg: '#F1F2F6', color: '#6B7280' },
  Medium: { bg: '#E7EEFD', color: '#2F6FED' },
  High: { bg: '#FEF3C7', color: '#B45309' },
  Critical: { bg: '#FEE2E2', color: '#B91C1C' },
};

export default function StatusBadge({ status, kind = 'status' }) {
  const map = kind === 'priority' ? PRIORITY_STYLES : STATUS_STYLES;
  const style = map[status] || { bg: '#F1F2F6', color: '#374151' };
  return (
    <span
      className="status-badge"
      style={{ backgroundColor: style.bg, color: style.color }}
    >
      {status}
    </span>
  );
}
