import { useState, useEffect } from 'react';
import api from '../../api/axios';
import StatCard from '../../components/admin/StatCard';

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.get('/admin/dashboard/stats');
      setStats(response.data.stats || response.data);

      console.log('[Dashboard] Stats loaded:', response.data);
    } catch (err) {
      console.error('[Dashboard] Fetch error:', err);
      let msg = 'ไม่สามารถโหลดข้อมูลแดชบอร์ดได้';

      if (err.response) {
        if (err.response.status === 404) {
          msg = 'ไม่พบ endpoint แดชบอร์ด - ตรวจสอบการ mount route ใน backend';
        } else if (err.response.status === 500) {
          msg = 'เซิร์ฟเวอร์เกิดข้อผิดพลาดภายใน (500) - ดู log backend';
        } else {
          msg = err.response.data?.message || err.message;
        }
      } else if (err.request) {
        msg = 'ไม่สามารถเชื่อมต่อ backend ได้';
      }

      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return `฿${Number(amount || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}`;
  };

  if (loading) {
    return (
      <div style={styles.loading}>
        <div style={styles.spinner}></div>
        <p style={styles.loadingText}>กำลังโหลดข้อมูลแดชบอร์ด...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.errorContainer}>
        <div style={styles.errorIcon}>⚠️</div>
        <h2 style={styles.errorTitle}>เกิดข้อผิดพลาด</h2>
        <p style={styles.errorMessage}>{error}</p>
        <button onClick={fetchDashboardStats} style={styles.retryButton}>
          <span style={styles.retryIcon}>↻</span> ลองโหลดใหม่
        </button>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>แดชบอร์ดผู้ดูแลระบบ</h1>
        <p style={styles.subtitle}>ภาพรวมข้อมูลการขายและลูกค้า</p>
      </div>

      {/* Stats Grid */}
      <div style={styles.statsGrid}>
        <StatCard 
          title="ยอดขายวันนี้" 
          value={formatCurrency(stats?.todaySales)} 
          icon="💰" 
          color="#10b981" 
          subtitle="อัพเดทแบบเรียลไทม์"
        />
        <StatCard 
          title="ยอดขายเดือนนี้" 
          value={formatCurrency(stats?.monthSales)} 
          icon="📈" 
          color="#3b82f6" 
          subtitle="เทียบกับเดือนที่แล้ว"
        />
        <StatCard 
          title="ยอดขายปีนี้" 
          value={formatCurrency(stats?.yearSales)} 
          icon="🎯" 
          color="#8b5cf6" 
          subtitle="เป้าหมายรายปี"
        />
        <StatCard 
          title="Orders รอดำเนินการ" 
          value={stats?.pendingOrders || 0} 
          icon="📦" 
          color="#f59e0b" 
          subtitle="ต้องดำเนินการ"
        />
      </div>

      {/* Members by Tier */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>
          <span style={styles.sectionIcon}>👥</span>
          สมาชิกตามระดับ
        </h2>
        <div style={styles.tiersGrid}>
          {stats?.membersByTier?.length > 0 ? (
            stats.membersByTier.map((tier) => (
              <div key={tier.tier_id} style={styles.tierCard} className="tier-card">
                <div style={styles.tierIcon}>
                  {tier.tier_name === 'Bronze' && '🥉'}
                  {tier.tier_name === 'Silver' && '🥈'}
                  {tier.tier_name === 'Gold' && '🥇'}
                  {tier.tier_name === 'VIP' && '💎'}
                </div>
                <div style={styles.tierName}>{tier.tier_name}</div>
                <div style={styles.tierCount}>{tier.count.toLocaleString('th-TH')} <span style={styles.tierLabel}>คน</span></div>
              </div>
            ))
          ) : (
            <div style={styles.emptyState}>
              <div style={styles.emptyIcon}>📊</div>
              <p style={styles.emptyText}>ไม่มีข้อมูลระดับสมาชิก</p>
            </div>
          )}
        </div>
      </div>

      {/* Recent Orders */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>
          <span style={styles.sectionIcon}>🛒</span>
          คำสั่งซื้อล่าสุด
        </h2>
        {stats?.recentOrders?.length > 0 ? (
          <div style={styles.tableContainer}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Order ID</th>
                  <th style={styles.th}>ลูกค้า</th>
                  <th style={styles.th}>ยอดเงิน</th>
                  <th style={styles.th}>สถานะ</th>
                  <th style={styles.th}>วันที่</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentOrders.map((order, idx) => (
                  <tr key={order.order_id} style={{ ...styles.tr, animationDelay: `${idx * 50}ms` }} className="table-row">
                    <td style={styles.td}>
                      <span style={styles.orderId}>#{order.order_id}</span>
                    </td>
                    <td style={styles.td}>
                      <div style={styles.customerInfo}>
                        <span style={styles.customerAvatar}>
                          {(order.customer_name || order.customer_email || 'X')[0].toUpperCase()}
                        </span>
                        <span>{order.customer_name || order.customer_email || 'ไม่ระบุ'}</span>
                      </div>
                    </td>
                    <td style={styles.td}>
                      <span style={styles.price}>{formatCurrency(order.total_price)}</span>
                    </td>
                    <td style={styles.td}>
                      <span style={{ ...styles.badge, ...getBadgeStyle(order.status) }}>
                        {getStatusText(order.status)}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <span style={styles.dateText}>
                        {order.created_at 
                          ? new Date(order.created_at).toLocaleString('th-TH', {
                              dateStyle: 'medium',
                              timeStyle: 'short'
                            })
                          : '-'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={styles.emptyState}>
            <div style={styles.emptyIcon}>📭</div>
            <p style={styles.emptyText}>ยังไม่มีคำสั่งซื้อล่าสุด</p>
          </div>
        )}
      </div>
    </div>
  );
};

const getStatusText = (status) => {
  const map = {
    pending: 'รอชำระเงิน',
    paid: 'ชำระแล้ว',
    shipped: 'จัดส่งแล้ว',
    completed: 'สำเร็จ',
    cancelled: 'ยกเลิก'
  };
  return map[status] || status;
};

const getBadgeStyle = (status) => {
  const map = {
    pending: { backgroundColor: '#fef3c7', color: '#92400e', border: '1px solid #fcd34d' },
    paid: { backgroundColor: '#d1fae5', color: '#065f46', border: '1px solid #6ee7b7' },
    shipped: { backgroundColor: '#dbeafe', color: '#1e40af', border: '1px solid #93c5fd' },
    completed: { backgroundColor: '#e5e7eb', color: '#374151', border: '1px solid #d1d5db' },
    cancelled: { backgroundColor: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5' }
  };
  return map[status] || {};
};

const styles = {
  container: {
    padding: '2rem',
    maxWidth: '1400px',
    margin: '0 auto',
    backgroundColor: '#f8fafc',
    minHeight: '100vh',
  },
  header: {
    marginBottom: '2.5rem',
  },
  title: {
    fontSize: '2.25rem',
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: '0.5rem',
    letterSpacing: '-0.5px',
  },
  subtitle: {
    fontSize: '1rem',
    color: '#64748b',
    fontWeight: '500',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '1.5rem',
    marginBottom: '3rem',
  },
  loading: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '60vh',
    color: '#64748b',
  },
  spinner: {
    width: '56px',
    height: '56px',
    border: '4px solid #e2e8f0',
    borderTop: '4px solid #3b82f6',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginBottom: '1.5rem',
  },
  loadingText: {
    fontSize: '1.1rem',
    fontWeight: '500',
  },
  errorContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '60vh',
    padding: '2rem',
  },
  errorIcon: {
    fontSize: '4rem',
    marginBottom: '1rem',
  },
  errorTitle: {
    fontSize: '1.75rem',
    fontWeight: '700',
    color: '#dc2626',
    marginBottom: '0.75rem',
  },
  errorMessage: {
    fontSize: '1rem',
    color: '#64748b',
    textAlign: 'center',
    maxWidth: '500px',
    marginBottom: '1.5rem',
    lineHeight: '1.6',
  },
  retryButton: {
    padding: '0.875rem 2rem',
    backgroundColor: '#3b82f6',
    color: '#ffffff',
    border: 'none',
    borderRadius: '12px',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  retryIcon: {
    fontSize: '1.25rem',
    display: 'inline-block',
  },
  section: {
    backgroundColor: '#ffffff',
    borderRadius: '20px',
    padding: '2rem',
    marginBottom: '2rem',
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.06)',
    border: '1px solid rgba(0, 0, 0, 0.05)',
  },
  sectionTitle: {
    fontSize: '1.5rem',
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: '1.5rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
  },
  sectionIcon: {
    fontSize: '1.75rem',
  },
  tiersGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '1.25rem',
  },
  tierCard: {
    backgroundColor: '#f8fafc',
    borderRadius: '16px',
    padding: '1.75rem 1.25rem',
    textAlign: 'center',
    transition: 'all 0.3s ease',
    border: '2px solid #e2e8f0',
    cursor: 'pointer',
  },
  tierIcon: {
    fontSize: '3rem',
    marginBottom: '0.75rem',
  },
  tierName: {
    fontSize: '1.1rem',
    fontWeight: '700',
    color: '#334155',
    marginBottom: '0.5rem',
  },
  tierCount: {
    fontSize: '1.75rem',
    fontWeight: '800',
    color: '#0f172a',
  },
  tierLabel: {
    fontSize: '0.9rem',
    fontWeight: '500',
    color: '#64748b',
  },
  tableContainer: {
    overflowX: 'auto',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  th: {
    padding: '1rem 1.25rem',
    textAlign: 'left',
    fontWeight: '700',
    fontSize: '0.875rem',
    color: '#475569',
    backgroundColor: '#f8fafc',
    borderBottom: '2px solid #e2e8f0',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  tr: {
    transition: 'background-color 0.2s ease',
    animation: 'fadeIn 0.4s ease forwards',
    opacity: 0,
  },
  td: {
    padding: '1.25rem',
    borderBottom: '1px solid #f1f5f9',
    fontSize: '0.95rem',
    color: '#334155',
  },
  orderId: {
    fontWeight: '700',
    color: '#3b82f6',
    fontFamily: 'monospace',
  },
  customerInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
  },
  customerAvatar: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    backgroundColor: '#3b82f6',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '700',
    fontSize: '0.9rem',
  },
  price: {
    fontWeight: '700',
    color: '#10b981',
    fontSize: '1rem',
  },
  badge: {
    padding: '0.375rem 0.875rem',
    borderRadius: '9999px',
    fontSize: '0.875rem',
    fontWeight: '600',
    display: 'inline-block',
  },
  dateText: {
    color: '#64748b',
    fontSize: '0.9rem',
  },
  emptyState: {
    textAlign: 'center',
    padding: '3rem 1rem',
  },
  emptyIcon: {
    fontSize: '4rem',
    marginBottom: '1rem',
    opacity: 0.5,
  },
  emptyText: {
    color: '#94a3b8',
    fontSize: '1rem',
    fontWeight: '500',
  },
};

// Add animations
const globalStyle = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .tier-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.1);
    border-color: #cbd5e1;
  }

  .table-row:hover {
    background-color: #f8fafc !important;
  }

  .retryButton:hover {
    background-color: #2563eb !important;
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(59, 130, 246, 0.4) !important;
  }

  .retryButton:active {
    transform: translateY(0);
  }

  @media (max-width: 768px) {
    .statsGrid {
      grid-template-columns: 1fr !important;
    }
    .tiersGrid {
      grid-template-columns: repeat(2, 1fr) !important;
    }
  }
`;

if (!document.getElementById('dashboard-animations')) {
  const styleEl = document.createElement('style');
  styleEl.id = 'dashboard-animations';
  styleEl.textContent = globalStyle;
  document.head.appendChild(styleEl);
}

export default Dashboard;