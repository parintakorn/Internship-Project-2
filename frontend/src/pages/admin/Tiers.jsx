import { useState, useEffect } from 'react';
import api from '../../api/axios';

const Tiers = () => {
  const [tiers, setTiers] = useState([]);
  const [tierStats, setTierStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editTier, setEditTier] = useState(null);
  const [formData, setFormData] = useState({
    tier_name: '',
    min_spending: '',
    discount_percent: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // ⭐ ใช้ api instance (มี token interceptor อยู่แล้ว)
      const [tiersRes, statsRes] = await Promise.all([
        api.get('/admin/tiers'),
        api.get('/admin/members/tier-stats')
      ]);
      
      setTiers(tiersRes.data.tiers);
      setTierStats(statsRes.data.stats);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (tier) => {
    setEditTier(tier);
    setFormData({
      tier_name: tier.tier_name,
      min_spending: tier.min_spending,
      discount_percent: tier.discount_percent
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // ⭐ ใช้ api instance
      await api.put(`/admin/tiers/${editTier.tier_id}`, formData);
      
      alert('อัปเดต Tier สำเร็จ!');
      setEditTier(null);
      fetchData();
    } catch (error) {
      console.error('Error updating tier:', error);
      alert('เกิดข้อผิดพลาด');
    }
  };

  if (loading) {
    return <div style={styles.loading}>กำลังโหลดข้อมูล...</div>;
  }

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>ระดับสมาชิก (Member Tiers)</h1>

      {/* Stats Overview */}
      <div style={styles.statsGrid}>
        {tierStats.map((stat) => (
          <div key={stat.tier_id} style={styles.statCard}>
            <div style={styles.statIcon}>
              {stat.tier_name === 'Bronze' && '🥉'}
              {stat.tier_name === 'Silver' && '🥈'}
              {stat.tier_name === 'Gold' && '🥇'}
              {stat.tier_name === 'VIP' && '💎'}
            </div>
            <div style={styles.statInfo}>
              <h3 style={styles.statTierName}>{stat.tier_name}</h3>
              <div style={styles.statDetails}>
                <div style={styles.statItem}>
                  <span style={styles.statLabel}>สมาชิก:</span>
                  <span style={styles.statValue}>{stat.member_count} คน</span>
                </div>
                <div style={styles.statItem}>
                  <span style={styles.statLabel}>ส่วนลด:</span>
                  <span style={styles.statValue}>{stat.discount_percent}%</span>
                </div>
                <div style={styles.statItem}>
                  <span style={styles.statLabel}>ยอดซื้อเฉลี่ย:</span>
                  <span style={styles.statValue}>
                    ฿{parseFloat(stat.avg_spending || 0).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Tiers Management */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>จัดการเกณฑ์ Tier</h2>
        <div style={styles.tiersTable}>
          {tiers.map((tier) => (
            <div key={tier.tier_id} style={styles.tierRow}>
              {editTier?.tier_id === tier.tier_id ? (
                // Edit Mode
                <form onSubmit={handleSubmit} style={styles.editForm}>
                  <div style={styles.editField}>
                    <label style={styles.label}>ชื่อระดับ:</label>
                    <input
                      type="text"
                      value={formData.tier_name}
                      onChange={(e) => setFormData({...formData, tier_name: e.target.value})}
                      style={styles.input}
                      required
                    />
                  </div>
                  <div style={styles.editField}>
                    <label style={styles.label}>ยอดซื้อขั้นต่ำ (฿):</label>
                    <input
                      type="number"
                      value={formData.min_spending}
                      onChange={(e) => setFormData({...formData, min_spending: e.target.value})}
                      style={styles.input}
                      required
                    />
                  </div>
                  <div style={styles.editField}>
                    <label style={styles.label}>ส่วนลด (%):</label>
                    <input
                      type="number"
                      value={formData.discount_percent}
                      onChange={(e) => setFormData({...formData, discount_percent: e.target.value})}
                      style={styles.input}
                      step="0.01"
                      required
                    />
                  </div>
                  <div style={styles.editActions}>
                    <button type="submit" style={styles.saveBtn}>บันทึก</button>
                    <button 
                      type="button" 
                      onClick={() => setEditTier(null)}
                      style={styles.cancelBtn}
                    >
                      ยกเลิก
                    </button>
                  </div>
                </form>
              ) : (
                // View Mode
                <>
                  <div style={styles.tierInfo}>
                    <div style={styles.tierHeader}>
                      <span style={styles.tierIcon}>
                        {tier.tier_name === 'Bronze' && '🥉'}
                        {tier.tier_name === 'Silver' && '🥈'}
                        {tier.tier_name === 'Gold' && '🥇'}
                        {tier.tier_name === 'VIP' && '💎'}
                      </span>
                      <h3 style={styles.tierName}>{tier.tier_name}</h3>
                    </div>
                    <div style={styles.tierDetails}>
                      <div style={styles.tierDetail}>
                        <span style={styles.tierDetailLabel}>ยอดซื้อขั้นต่ำ:</span>
                        <span style={styles.tierDetailValue}>
                          ฿{tier.min_spending.toLocaleString()}
                        </span>
                      </div>
                      <div style={styles.tierDetail}>
                        <span style={styles.tierDetailLabel}>ส่วนลด:</span>
                        <span style={styles.tierDetailValue}>
                          {tier.discount_percent}%
                        </span>
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleEdit(tier)}
                    style={styles.editButton}
                  >
                    แก้ไข
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Info */}
      <div style={styles.infoBox}>
        <h3 style={styles.infoTitle}>ℹ️ หมายเหตุ</h3>
        <ul style={styles.infoList}>
          <li>ระบบจะอัปเดตระดับสมาชิกอัตโนมัติเมื่อมียอดซื้อเพิ่มขึ้น</li>
          <li>การแก้ไขเกณฑ์จะมีผลทันที และคำนวณระดับสมาชิกทุกคนใหม่</li>
          <li>ส่วนลดจะถูกนำไปใช้กับการสั่งซื้อครั้งถัดไปอัตโนมัติ</li>
        </ul>
      </div>
    </div>
  );
};

const styles = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
  },
  loading: {
    textAlign: 'center',
    padding: '3rem',
    fontSize: '1.2rem',
    color: '#666',
  },
  title: {
    fontSize: '2rem',
    marginBottom: '2rem',
    color: '#333',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '1.5rem',
    marginBottom: '3rem',
  },
  statCard: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '1.5rem',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    display: 'flex',
    gap: '1rem',
  },
  statIcon: {
    fontSize: '3rem',
  },
  statInfo: {
    flex: 1,
  },
  statTierName: {
    fontSize: '1.3rem',
    marginBottom: '0.75rem',
    color: '#333',
  },
  statDetails: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  statItem: {
    display: 'flex',
    justifyContent: 'space-between',
  },
  statLabel: {
    color: '#666',
    fontSize: '0.9rem',
  },
  statValue: {
    fontWeight: 'bold',
    color: '#ee4d2d',
  },
  section: {
    marginBottom: '3rem',
  },
  sectionTitle: {
    fontSize: '1.5rem',
    marginBottom: '1.5rem',
    color: '#333',
  },
  tiersTable: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  tierRow: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '1.5rem',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tierInfo: {
    flex: 1,
  },
  tierHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    marginBottom: '1rem',
  },
  tierIcon: {
    fontSize: '2rem',
  },
  tierName: {
    fontSize: '1.5rem',
    margin: 0,
    color: '#333',
  },
  tierDetails: {
    display: 'flex',
    gap: '2rem',
  },
  tierDetail: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
  },
  tierDetailLabel: {
    fontSize: '0.85rem',
    color: '#666',
  },
  tierDetailValue: {
    fontSize: '1.1rem',
    fontWeight: 'bold',
    color: '#ee4d2d',
  },
  editButton: {
    padding: '0.75rem 1.5rem',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '1rem',
  },
  editForm: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  editField: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  label: {
    fontSize: '0.9rem',
    fontWeight: '500',
    color: '#333',
  },
  input: {
    padding: '0.75rem',
    border: '1px solid #ddd',
    borderRadius: '6px',
    fontSize: '1rem',
    outline: 'none',
  },
  editActions: {
    display: 'flex',
    gap: '1rem',
    marginTop: '0.5rem',
  },
  saveBtn: {
    flex: 1,
    padding: '0.75rem',
    backgroundColor: '#28a745',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '1rem',
  },
  cancelBtn: {
    flex: 1,
    padding: '0.75rem',
    backgroundColor: '#6c757d',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '1rem',
  },
  infoBox: {
    backgroundColor: '#e7f3ff',
    borderLeft: '4px solid #007bff',
    padding: '1.5rem',
    borderRadius: '8px',
  },
  infoTitle: {
    fontSize: '1.1rem',
    marginBottom: '1rem',
    color: '#007bff',
  },
  infoList: {
    margin: 0,
    paddingLeft: '1.5rem',
    color: '#333',
    lineHeight: '1.8',
  },
};

export default Tiers;