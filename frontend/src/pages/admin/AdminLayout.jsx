import { Outlet, useNavigate } from 'react-router-dom';
import { useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import Sidebar from '../../components/admin/Sidebar';

const AdminLayout = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div style={styles.layout}>
      <Sidebar />
      
      <div style={styles.main}>
        <header style={styles.header}>
          <div style={styles.headerLeft}>
            <h1 style={styles.headerTitle}>
              <span style={styles.logoIcon}>🏪</span>
              BIGURI-SHOP
            </h1>
            <span style={styles.adminBadge}>Admin Panel</span>
          </div>
          
          <div style={styles.headerRight}>
            <div style={styles.userCard}>
              <div style={styles.userAvatar}>
                {(user?.name || user?.email || 'A').charAt(0).toUpperCase()}
              </div>
              <div style={styles.userDetails}>
                <div style={styles.userName}>{user?.name || 'Admin'}</div>
                <div style={styles.userEmail}>{user?.email || 'admin@biguri.com'}</div>
              </div>
            </div>
            
            <button 
              onClick={handleLogout} 
              style={styles.logoutBtn}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#c62828'}
              onMouseLeave={(e) => e.target.style.backgroundColor = '#d32f2f'}
            >
              <span style={styles.logoutIcon}>🚪</span>
              ออกจากระบบ
            </button>
          </div>
        </header>
        
        <div style={styles.content}>
          <Outlet />
        </div>
        
        {/* Footer */}
        <footer style={styles.footer}>
          <div style={styles.footerContent}>
            <span style={styles.footerText}>© 2024 BIGURI-SHOP. All rights reserved.</span>
            <span style={styles.footerVersion}>Version 1.0.0</span>
          </div>
        </footer>
      </div>
    </div>
  );
};

const styles = {
  layout: {
    display: 'flex',
    minHeight: '100vh',
    backgroundColor: '#f0f2f5',
    fontFamily: '"Inter", "Segoe UI", Tahoma, sans-serif',
  },
  
  main: {
    marginLeft: '250px',
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    transition: 'margin-left 0.3s ease',
  },
  
  // Header Styles
  header: {
    backgroundColor: '#fff',
    padding: '16px 32px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    position: 'sticky',
    top: 0,
    zIndex: 100,
    borderBottom: '1px solid #e0e0e0',
  },
  
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
  },
  
  headerTitle: {
    margin: 0,
    fontSize: '24px',
    fontWeight: '700',
    color: '#1a1a1a',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    letterSpacing: '-0.5px',
  },
  
  logoIcon: {
    fontSize: '28px',
    filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))',
  },
  
  adminBadge: {
    backgroundColor: '#2196f3',
    color: '#fff',
    padding: '6px 14px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    boxShadow: '0 2px 6px rgba(33, 150, 243, 0.3)',
  },
  
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
  },
  
  // User Card
  userCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '8px 16px',
    backgroundColor: '#f8f9fa',
    borderRadius: '12px',
    border: '1px solid #e0e0e0',
  },
  
  userAvatar: {
    width: '42px',
    height: '42px',
    borderRadius: '50%',
    backgroundColor: '#2196f3',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '18px',
    fontWeight: '700',
    boxShadow: '0 2px 6px rgba(33, 150, 243, 0.3)',
  },
  
  userDetails: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  
  userName: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#1a1a1a',
    lineHeight: 1.2,
  },
  
  userEmail: {
    fontSize: '12px',
    color: '#666',
    lineHeight: 1.2,
  },
  
  // Logout Button
  logoutBtn: {
    padding: '10px 20px',
    backgroundColor: '#d32f2f',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    transition: 'all 0.3s ease',
    boxShadow: '0 2px 6px rgba(211, 47, 47, 0.3)',
  },
  
  logoutIcon: {
    fontSize: '16px',
  },
  
  // Content
  content: {
    flex: 1,
    padding: '0',
    backgroundColor: '#f0f2f5',
  },
  
  // Footer
  footer: {
    backgroundColor: '#fff',
    borderTop: '1px solid #e0e0e0',
    padding: '16px 32px',
    marginTop: 'auto',
  },
  
  footerContent: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    maxWidth: '1400px',
    margin: '0 auto',
  },
  
  footerText: {
    fontSize: '13px',
    color: '#666',
  },
  
  footerVersion: {
    fontSize: '12px',
    color: '#999',
    backgroundColor: '#f5f5f5',
    padding: '4px 12px',
    borderRadius: '12px',
    fontWeight: '500',
  },
};

// Add hover effects
// Add hover effects + Print styles
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @media (max-width: 768px) {
    /* Responsive adjustments */
  }

  @media print {
    /* ซ่อน header, sidebar, footer ตอนพิมพ์ */
    header,
    footer,
    nav {
      display: none !important;
    }

    /* ให้ content ขยายเต็มจอ ไม่มี margin จาก sidebar */
    #main {
      margin-left: 0 !important;
    }
  }
`;
document.head.appendChild(styleSheet);

export default AdminLayout;
