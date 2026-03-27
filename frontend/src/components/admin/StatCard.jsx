import React from 'react';

const StatCard = ({ title, value, icon, color = '#ee4d2d', subtitle }) => {
  return (
    <div className="stat-card" style={styles.card}>
      <div className="stat-card-icon-wrapper" style={{ ...styles.iconWrapper, backgroundColor: `${color}20` }}>
        <span style={{ ...styles.icon, color }}>{icon}</span>
      </div>
      <div style={styles.content}>
        <div style={styles.title}>{title}</div>
        <div style={{ ...styles.value, color }}>{value}</div>
        {subtitle && <div style={styles.subtitle}>{subtitle}</div>}
      </div>
      {/* Decorative gradient overlay */}
      <div style={{ ...styles.gradientOverlay, background: `linear-gradient(135deg, ${color}05, transparent)` }} />
    </div>
  );
};

const styles = {
  card: {
    background: '#ffffff',
    borderRadius: '20px',
    padding: '1.75rem 1.5rem',
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.06)',
    display: 'flex',
    alignItems: 'center',
    gap: '1.5rem',
    transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
    cursor: 'pointer',
    minHeight: '140px',
    flex: '1 1 300px',
    border: '1px solid rgba(0, 0, 0, 0.05)',
    overflow: 'hidden',
    position: 'relative',
  },
  iconWrapper: {
    width: '70px',
    height: '70px',
    borderRadius: '18px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
  },
  icon: {
    fontSize: '2.3rem',
    transition: 'transform 0.3s ease',
  },
  content: {
    flex: 1,
    minWidth: 0,
    zIndex: 1,
  },
  title: {
    fontSize: '0.9rem',
    fontWeight: '600',
    color: '#64748b',
    marginBottom: '0.5rem',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  value: {
    fontSize: '2.2rem',
    fontWeight: '800',
    lineHeight: '1.1',
    letterSpacing: '-1px',
    marginBottom: '0.25rem',
  },
  subtitle: {
    fontSize: '0.85rem',
    color: '#94a3b8',
    marginTop: '0.4rem',
    fontWeight: '500',
  },
  gradientOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    pointerEvents: 'none',
    opacity: 0.5,
  },
};

// Enhanced CSS with smooth animations
if (typeof window !== 'undefined' && !document.getElementById('stat-card-styles')) {
  const style = document.createElement('style');
  style.id = 'stat-card-styles';
  style.textContent = `
    .stat-card {
      will-change: transform, box-shadow;
    }
    
    .stat-card:hover {
      transform: translateY(-6px) scale(1.01);
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.12) !important;
    }
    
    .stat-card:active {
      transform: translateY(-3px) scale(0.99);
    }
    
    .stat-card:hover .stat-card-icon-wrapper {
      transform: scale(1.1) rotate(5deg);
      box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15) !important;
    }
    
    .stat-card:hover .stat-card-icon-wrapper span {
      transform: scale(1.1);
    }
    
    /* Responsive adjustments */
    @media (max-width: 768px) {
      .stat-card {
        min-height: 120px !important;
        padding: 1.25rem 1rem !important;
      }
    }
    
    /* Loading animation */
    @keyframes shimmer {
      0% {
        background-position: -1000px 0;
      }
      100% {
        background-position: 1000px 0;
      }
    }
    
    .stat-card.loading {
      background: linear-gradient(
        90deg,
        #f0f0f0 0px,
        #f8f8f8 40px,
        #f0f0f0 80px
      );
      background-size: 1000px 100%;
      animation: shimmer 2s infinite;
    }
  `;
  document.head.appendChild(style);
}

export default StatCard;