export default function StatCard({ icon: Icon, iconBg, iconColor, label, value, delta, deltaTone = 'up', onClick }) {
  return (
    <div className={`stat-card${onClick ? ' clickable' : ''}`} onClick={onClick}>
      <div className="stat-icon" style={{ backgroundColor: iconBg, color: iconColor }}>
        <Icon size={20} strokeWidth={2} />
      </div>
      <div className="stat-body">
        <p className="stat-label">{label}</p>
        <p className="stat-value">{value}</p>
        {delta && <p className={`stat-delta stat-delta--${deltaTone}`}>{delta}</p>}
      </div>
    </div>
  );
}
