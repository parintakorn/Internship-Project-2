import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';

const Members = () => {
  const navigate = useNavigate();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [tierFilter, setTierFilter] = useState('');
  const [pagination, setPagination] = useState({});

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch members
  useEffect(() => {
    fetchMembers();
  }, [debouncedSearch, tierFilter]);

  const fetchMembers = async (page = 1) => {
    try {
      setLoading(true);
      const response = await api.get('/admin/members', {
        params: { 
          page, 
          search: debouncedSearch,
          tier: tierFilter 
        }
      });
      setMembers(response.data.members || []);
      setPagination(response.data.pagination || {});
      console.log('👥 Members loaded:', response.data.members?.length);
    } catch (error) {
      console.error('Error fetching members:', error);
      setMembers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    setSearch(e.target.value);
  };

  // Navigate ไปหน้า MemberProfile ของ Admin
  const handleViewProfile = (member) => {
    console.log('🔗 Navigating to member profile:', member.user_id);
    // ใช้ route ที่มีอยู่ใน App.jsx: /admin/members/:userId/profile
    navigate(`/admin/members/${member.user_id}/profile`);
  };

  if (loading && members.length === 0) {
    return <div style={styles.loading}>กำลังโหลดข้อมูล...</div>;
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>จัดการสมาชิก</h1>
      </div>

      {/* Filters */}
      <div style={styles.filters}>
        <div style={styles.searchWrapper}>
          <input
            type="text"
            placeholder="ค้นหา (อีเมล, ชื่อ)..."
            value={search}
            onChange={handleSearch}
            style={styles.searchInput}
          />
          {loading && <span style={styles.searchLoading}>🔄</span>}
        </div>
        <select
          value={tierFilter}
          onChange={(e) => setTierFilter(e.target.value)}
          style={styles.select}
        >
          <option value="">ทุกระดับ</option>
          <option value="1">Bronze</option>
          <option value="2">Silver</option>
          <option value="3">Gold</option>
          <option value="4">VIP</option>
        </select>
      </div>

      {/* Stats Summary */}
      <div style={styles.summary}>
        <div style={styles.summaryItem}>
          <span style={styles.summaryLabel}>สมาชิกทั้งหมด:</span>
          <span style={styles.summaryValue}>{pagination.totalMembers || 0} คน</span>
        </div>
      </div>

      {/* Members Table */}
      <div style={styles.tableContainer}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>ID</th>
              <th style={styles.th}>อีเมล</th>
              <th style={styles.th}>ชื่อ</th>
              <th style={styles.th}>เบอร์โทร</th>
              <th style={styles.th}>ระดับ</th>
              <th style={styles.th}>ยอดซื้อสะสม</th>
              <th style={styles.th}>ส่วนลด</th>
              <th style={styles.th}>สมัครเมื่อ</th>
              <th style={styles.th}>จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {members.length === 0 ? (
              <tr>
                <td colSpan="9" style={{ textAlign: 'center', padding: '2rem', color: '#999' }}>
                  {loading ? 'กำลังค้นหา...' : 'ไม่พบข้อมูลสมาชิก'}
                </td>
              </tr>
            ) : (
              members.map((member) => (
                <tr key={member.user_id} style={styles.tr}>
                  <td style={styles.td}>{member.user_id}</td>
                  <td style={styles.td}>{member.email}</td>
                  <td style={styles.td}>{member.name || '-'}</td>
                  <td style={styles.td}>{member.phone || '-'}</td>
                  <td style={styles.td}>
                    <span style={{...styles.tierBadge, ...getTierColor(member.tier_name)}}>
                      {getTierIcon(member.tier_name)} {member.tier_name}
                    </span>
                  </td>
                  <td style={styles.td}>฿{member.total_spending?.toLocaleString() || 0}</td>
                  <td style={styles.td}>{member.discount_percent || 0}%</td>
                  <td style={styles.td}>
                    {member.created_at ? new Date(member.created_at).toLocaleDateString('th-TH') : '-'}
                  </td>
                  <td style={styles.td}>
                    <button 
                      onClick={() => handleViewProfile(member)}
                      style={styles.actionBtn}
                      title="ดูโปรไฟล์และที่อยู่"
                      onMouseEnter={(e) => e.target.style.backgroundColor = '#0056b3'}
                      onMouseLeave={(e) => e.target.style.backgroundColor = '#007bff'}
                    >
                      👤 โปรไฟล์
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div style={styles.pagination}>
          <button
            onClick={() => fetchMembers(pagination.currentPage - 1)}
            disabled={pagination.currentPage === 1}
            style={styles.paginationBtn}
          >
            ← ก่อนหน้า
          </button>
          <span style={styles.paginationInfo}>
            หน้า {pagination.currentPage} / {pagination.totalPages}
          </span>
          <button
            onClick={() => fetchMembers(pagination.currentPage + 1)}
            disabled={pagination.currentPage === pagination.totalPages}
            style={styles.paginationBtn}
          >
            ถัดไป →
          </button>
        </div>
      )}
    </div>
  );
};

// Helper Functions
const getTierIcon = (tierName) => {
  const icons = {
    'Bronze': '🥉',
    'Silver': '🥈',
    'Gold': '🥇',
    'VIP': '👑'
  };
  return icons[tierName] || '⭐';
};

const getTierColor = (tierName) => {
  const colors = {
    'Bronze': {
      backgroundColor: '#CD7F32',
      color: 'white',
    },
    'Silver': {
      backgroundColor: '#C0C0C0',
      color: '#333',
    },
    'Gold': {
      backgroundColor: '#FFD700',
      color: '#333',
    },
    'VIP': {
      backgroundColor: '#9C27B0',
      color: 'white',
    }
  };
  return colors[tierName] || {
    backgroundColor: '#e0e0e0',
    color: '#666',
  };
};

// Styles
const styles = {
  container: {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '2rem',
  },
  loading: {
    textAlign: 'center',
    padding: '3rem',
    fontSize: '1.2rem',
    color: '#666',
  },
  header: {
    marginBottom: '2rem',
  },
  title: {
    fontSize: '2rem',
    color: '#333',
    margin: 0,
  },
  filters: {
    display: 'flex',
    gap: '1rem',
    marginBottom: '1.5rem',
  },
  searchWrapper: {
    flex: 1,
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    padding: '0.75rem 1rem',
    border: '1px solid #ddd',
    borderRadius: '8px',
    fontSize: '1rem',
    outline: 'none',
  },
  searchLoading: {
    position: 'absolute',
    right: '1rem',
    fontSize: '1.2rem',
    animation: 'spin 1s linear infinite',
  },
  select: {
    padding: '0.75rem 1rem',
    border: '1px solid #ddd',
    borderRadius: '8px',
    fontSize: '1rem',
    outline: 'none',
    backgroundColor: 'white',
    cursor: 'pointer',
  },
  summary: {
    backgroundColor: '#f8f9fa',
    padding: '1.5rem',
    borderRadius: '8px',
    marginBottom: '1.5rem',
    display: 'flex',
    gap: '2rem',
  },
  summaryItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  summaryLabel: {
    fontSize: '0.9rem',
    color: '#666',
  },
  summaryValue: {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    color: '#333',
  },
  tableContainer: {
    overflowX: 'auto',
    backgroundColor: 'white',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  th: {
    padding: '1rem',
    textAlign: 'left',
    backgroundColor: '#f8f9fa',
    borderBottom: '2px solid #dee2e6',
    fontWeight: '600',
    color: '#495057',
    whiteSpace: 'nowrap',
  },
  tr: {
    borderBottom: '1px solid #dee2e6',
  },
  td: {
    padding: '1rem',
    color: '#212529',
  },
  tierBadge: {
    padding: '0.25rem 0.75rem',
    borderRadius: '12px',
    fontSize: '0.875rem',
    fontWeight: '500',
    display: 'inline-block',
  },
  actionBtn: {
    padding: '0.5rem 1rem',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '0.875rem',
    transition: 'background-color 0.2s',
  },
  pagination: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '1rem',
    marginTop: '2rem',
  },
  paginationBtn: {
    padding: '0.5rem 1rem',
    border: '1px solid #ddd',
    borderRadius: '6px',
    backgroundColor: 'white',
    cursor: 'pointer',
    fontSize: '0.9rem',
    transition: 'all 0.2s',
  },
  paginationInfo: {
    fontSize: '0.9rem',
    color: '#666',
  },
};

// CSS Animation
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  button:hover:not(:disabled) {
    opacity: 0.9;
  }
  
  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;
document.head.appendChild(styleSheet);

export default Members;