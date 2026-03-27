import { Link, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';

const Sidebar = () => {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const isActive = (path) => location.pathname === path;

  const menuItems = [
    { path: '/admin/dashboard',         label: 'Dashboard',     icon: '📊' },
    { path: '/admin/members',           label: 'สมาชิก',         icon: '👥' },
    { path: '/admin/orders',            label: 'คำสั่งซื้อ',     icon: '📦' },
    { path: '/admin/products',          label: 'สินค้า',          icon: '🛍️' },
    { path: '/admin/promotions',        label: 'โปรโมชั่น',      icon: '🎉' },
    { path: '/admin/promotion-banners', label: 'แบนเนอร์',       icon: '🖼️' },
    { path: '/admin/tiers',             label: 'ระดับสมาชิก',   icon: '🏆' },
    { path: '/admin/warehouse',         label: 'คลังวัตถุดิบ',   icon: '🏭' },
    { path: '/admin/ingredients',       label: 'QR วัตถุดิบ',    icon: '📋' },
  ];

  useEffect(() => {
    const checkScreen = () => {
      setIsMobile(window.innerWidth <= 768);
      if (window.innerWidth > 768) {
        setOpen(true);
      } else {
        setOpen(false);
      }
    };

    checkScreen();
    window.addEventListener('resize', checkScreen);
    return () => window.removeEventListener('resize', checkScreen);
  }, []);

  return (
    <>
      {/* Mobile Menu Button */}
      {isMobile && (
        <button onClick={() => setOpen(true)} style={styles.menuButton}>
          ☰
        </button>
      )}

      {/* Overlay */}
      {isMobile && open && (
        <div style={styles.overlay} onClick={() => setOpen(false)} />
      )}

      {/* Sidebar */}
      <div
  className="no-print"
  style={{
    ...styles.sidebar,
    ...(isMobile ? (open ? styles.sidebarOpen : styles.sidebarClosed) : {}),
  }}
>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.logoSection}>
            <div style={styles.logoIcon}>🏪</div>
            <div>
              <h2 style={styles.title}>BIGURI</h2>
              <p style={styles.subtitle}>Admin Panel</p>
            </div>
          </div>

          {isMobile && (
            <button onClick={() => setOpen(false)} style={styles.closeButton}>
              ✕
            </button>
          )}
        </div>

        {/* Navigation Menu */}
        <nav style={styles.nav}>
          {menuItems.map((item) => {
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => isMobile && setOpen(false)}
                style={{
                  ...styles.menuItem,
                  ...(active ? styles.menuItemActive : {}),
                }}
                onMouseEnter={(e) => {
                  if (!active) {
                    e.currentTarget.style.backgroundColor = 'rgba(238, 77, 45, 0.1)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!active) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }
                }}
              >
                <span style={styles.iconWrapper}>
                  <span style={styles.icon}>{item.icon}</span>
                </span>
                <span style={styles.label}>{item.label}</span>
                {active && <span style={styles.activeIndicator}>●</span>}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div style={styles.footer}>
          <div style={styles.divider}></div>
          <Link
            to="/"
            onClick={() => isMobile && setOpen(false)}
            style={styles.backLink}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(238, 77, 45, 0.1)';
              e.currentTarget.style.transform = 'translateX(5px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.transform = 'translateX(0)';
            }}
          >
            <span style={styles.backIcon}>←</span>
            <span>กลับหน้าหลัก</span>
          </Link>

          <div style={styles.versionInfo}>
            <span style={styles.versionText}>v1.0.0</span>
          </div>
        </div>
      </div>
    </>
  );
};

const styles = {
  menuButton: {
    position: 'fixed',
    top: '1rem',
    left: '1rem',
    zIndex: 1600,
    fontSize: '1.5rem',
    padding: '0.6rem 0.85rem',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: '#ee4d2d',
    color: 'white',
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(238, 77, 45, 0.4)',
    transition: 'all 0.3s ease',
  },
  overlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 1400,
    backdropFilter: 'blur(2px)',
  },
  sidebar: {
    width: '250px',
    height: '100vh',
    backgroundColor: '#1a1a2e',
    color: 'white',
    display: 'flex',
    flexDirection: 'column',
    position: 'fixed',
    left: 0,
    top: 0,
    zIndex: 1500,
    transition: 'transform 0.3s ease',
    boxShadow: '4px 0 12px rgba(0,0,0,0.15)',
    fontFamily: '"Inter", "Segoe UI", Tahoma, sans-serif',
  },
  sidebarClosed: {
    transform: 'translateX(-100%)',
  },
  sidebarOpen: {
    transform: 'translateX(0)',
  },
  header: {
    padding: '1.75rem 1.5rem',
    borderBottom: '1px solid rgba(255,255,255,0.12)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(238, 77, 45, 0.08)',
  },
  logoSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  logoIcon: {
    fontSize: '32px',
    filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))',
  },
  title: {
    margin: 0,
    fontSize: '1.5rem',
    fontWeight: '700',
    color: '#fff',
    letterSpacing: '0.5px',
  },
  subtitle: {
    margin: '2px 0 0 0',
    fontSize: '0.7rem',
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: '1px',
  },
  closeButton: {
    fontSize: '1.4rem',
    background: 'rgba(255,255,255,0.1)',
    border: 'none',
    color: 'white',
    cursor: 'pointer',
    width: '32px',
    height: '32px',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease',
  },
  nav: {
    flex: 1,
    padding: '1rem 0',       // ลด padding เล็กน้อยให้ดูสม่ำเสมอ
    overflowY: 'auto',
  },
  menuItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.85rem',
    padding: '0',
    paddingLeft: '1.5rem',
    paddingRight: '1.5rem',
    height: '52px',
    color: 'rgba(255,255,255,0.75)',
    textDecoration: 'none',
    transition: 'all 0.3s ease',
    position: 'relative',
    fontSize: '0.95rem',
    fontWeight: '500',
    lineHeight: 1,
  },
  menuItemActive: {
    paddingLeft: 'calc(1.5rem - 4px)',
    paddingRight: '1.5rem',
    height: '52px',
    borderLeft: '4px solid white',
    backgroundColor: '#ee4d2d',
    color: 'white',
    boxShadow: 'inset 0 0 20px rgba(0,0,0,0.1)',
  },
  iconWrapper: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '32px',
    height: '32px',
    minWidth: '32px',
    flexShrink: 0,
  },
  icon: {
    fontSize: '20px',
    lineHeight: 1,
    display: 'block',
    textAlign: 'center',
  },
  label: {
    flex: 1,
  },
  activeIndicator: {
    fontSize: '8px',
    color: 'white',
    animation: 'pulse 2s ease-in-out infinite',
  },
  footer: {
    padding: '0',
    borderTop: '1px solid rgba(255,255,255,0.12)',
  },
  divider: {
    height: '1px',
    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)',
  },
  backLink: {
    color: 'rgba(255,255,255,0.75)',
    textDecoration: 'none',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '1rem 1.5rem',
    fontSize: '0.9rem',
    fontWeight: '500',
    transition: 'all 0.3s ease',
  },
  backIcon: {
    fontSize: '1.2rem',
    transition: 'transform 0.3s ease',
  },
  versionInfo: {
    padding: '0.75rem 1.5rem',
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderTop: '1px solid rgba(255,255,255,0.05)',
  },
  versionText: {
    fontSize: '0.75rem',
    color: 'rgba(255,255,255,0.4)',
    fontWeight: '500',
    letterSpacing: '0.5px',
  },
};

const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
  nav::-webkit-scrollbar { width: 6px; }
  nav::-webkit-scrollbar-track { background: rgba(255,255,255,0.05); }
  nav::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 3px; }
  nav::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.3); }
`;
document.head.appendChild(styleSheet);

export default Sidebar;
