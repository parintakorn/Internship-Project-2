import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api/axios';

const MemberProfile = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  
  const [member, setMember] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    district: '',
    province: '',
    postalCode: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // โหลดข้อมูลสมาชิก
  useEffect(() => {
    if (userId) {
      fetchMember();
    }
  }, [userId]);

  const fetchMember = async () => {
    try {
      setLoading(true);
      console.log('📥 Fetching member data for userId:', userId);
      
      const response = await api.get(`/admin/members/${userId}`);
      const memberData = response.data.member;
      
      console.log('✅ Member data loaded:', memberData);
      
      setMember(memberData);
      setFormData({
        name: memberData.name || '',
        phone: memberData.phone || '',
        address: memberData.address || '',
        district: memberData.district || '',
        province: memberData.province || '',
        postalCode: memberData.postal_code || ''
      });
    } catch (error) {
      console.error('❌ Error fetching member:', error);
      setMessage({ type: 'error', text: '❌ ไม่สามารถโหลดข้อมูลสมาชิกได้' });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      console.log('💾 Saving member data:', formData);
      
      await api.put(`/admin/members/${userId}`, {
        name: formData.name,
        phone: formData.phone,
        address: formData.address,
        district: formData.district,
        province: formData.province,
        postal_code: formData.postalCode
      });

      console.log('✅ Member data saved successfully');

      // ⭐ สำคัญ! ดึงข้อมูลใหม่จาก database หลังบันทึก
      await fetchMember();

      setIsEditMode(false);
      setMessage({ type: 'success', text: '✅ บันทึกข้อมูลสำเร็จ!' });

      setTimeout(() => {
        setMessage({ type: '', text: '' });
      }, 3000);
      
    } catch (error) {
      console.error('❌ Update member error:', error);
      const errorMessage = error.response?.data?.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล';
      setMessage({ type: 'error', text: `❌ ${errorMessage}` });
      
      setTimeout(() => {
        setMessage({ type: '', text: '' });
      }, 5000);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    // ⭐ รีเซ็ตค่าจากข้อมูลที่โหลดล่าสุด
    if (member) {
      setFormData({
        name: member.name || '',
        phone: member.phone || '',
        address: member.address || '',
        district: member.district || '',
        province: member.province || '',
        postalCode: member.postal_code || ''
      });
    }
    setIsEditMode(false);
    setMessage({ type: '', text: '' });
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingBox}>
          <div style={styles.spinner}>⏳</div>
          <p>กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    );
  }

  if (!member) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingBox}>
          <p>❌ ไม่พบข้อมูลสมาชิก</p>
          <button 
            onClick={() => navigate('/admin/members')}
            style={styles.backButton}
          >
            ← กลับหน้ารายชื่อ
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.header}>
          <div>
            <button 
              onClick={() => navigate('/admin/members')}
              style={styles.backButton}
            >
              ← กลับ
            </button>
            <h2 style={styles.title}>
              <span style={styles.titleIcon}>👤</span>
              ข้อมูลสมาชิก
            </h2>
          </div>
          {!isEditMode && (
            <button 
              style={styles.editButton}
              onClick={() => setIsEditMode(true)}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#d63c1e'}
              onMouseLeave={(e) => e.target.style.backgroundColor = '#ee4d2d'}
            >
              <span style={styles.btnIcon}>✏️</span>
              แก้ไขข้อมูล
            </button>
          )}
        </div>

        {message.text && (
          <div style={{
            ...styles.messageBox,
            ...(message.type === 'success' ? styles.successBox : styles.errorBox)
          }}>
            {message.text}
          </div>
        )}
        
        <div style={styles.infoSection}>
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>🆔 User ID:</span>
            <span style={styles.infoValue}>{member.user_id}</span>
          </div>
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>📧 อีเมล:</span>
            <span style={styles.infoValue}>{member.email}</span>
          </div>
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>🏅 ระดับสมาชิก:</span>
            <span style={{
              ...styles.tierBadge,
              ...getTierColor(member.tier_name)
            }}>
              {getTierIcon(member.tier_name)} {member.tier_name}
            </span>
          </div>
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>💰 ยอดซื้อสะสม:</span>
            <span style={styles.infoValue}>฿{member.total_spending?.toLocaleString() || 0}</span>
          </div>
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>🎁 ส่วนลด:</span>
            <span style={styles.infoValue}>{member.discount_percent || 0}%</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.sectionHeader}>
            <span style={styles.sectionIcon}>📝</span>
            <span style={styles.sectionTitle}>ข้อมูลส่วนตัว</span>
          </div>
          
          <div style={styles.fieldGroup}>
            <label style={styles.label}>
              <span style={styles.labelIcon}>👤</span>
              ชื่อ-นามสกุล
              <span style={styles.required}>*</span>
            </label>
            <input
              type="text"
              placeholder="กรุณากรอกชื่อ-นามสกุล"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              style={{
                ...styles.input,
                ...(isEditMode ? styles.inputEnabled : styles.inputDisabled)
              }}
              disabled={!isEditMode}
              required
            />
          </div>

          <div style={styles.fieldGroup}>
            <label style={styles.label}>
              <span style={styles.labelIcon}>📱</span>
              เบอร์โทรศัพท์
            </label>
            <input
              type="tel"
              placeholder="0XX-XXX-XXXX"
              value={formData.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
              style={{
                ...styles.input,
                ...(isEditMode ? styles.inputEnabled : styles.inputDisabled)
              }}
              disabled={!isEditMode}
              maxLength="10"
            />
          </div>
          
          <div style={styles.sectionHeader}>
            <span style={styles.sectionIcon}>📍</span>
            <span style={styles.sectionTitle}>ที่อยู่</span>
          </div>
          
          <div style={styles.fieldGroup}>
            <label style={styles.label}>
              <span style={styles.labelIcon}>🏠</span>
              ที่อยู่
            </label>
            <textarea
              placeholder="บ้านเลขที่, ซอย, ถนน, หมู่บ้าน"
              value={formData.address}
              onChange={(e) => handleChange('address', e.target.value)}
              style={{
                ...styles.textarea,
                ...(isEditMode ? styles.inputEnabled : styles.inputDisabled)
              }}
              disabled={!isEditMode}
              rows="3"
            />
          </div>

          <div style={styles.formRow}>
            <div style={styles.fieldGroup}>
              <label style={styles.label}>
                <span style={styles.labelIcon}>🏘️</span>
                เขต/อำเภอ
              </label>
              <input
                type="text"
                placeholder="เขต/อำเภอ"
                value={formData.district}
                onChange={(e) => handleChange('district', e.target.value)}
                style={{
                  ...styles.input,
                  ...(isEditMode ? styles.inputEnabled : styles.inputDisabled)
                }}
                disabled={!isEditMode}
              />
            </div>

            <div style={styles.fieldGroup}>
              <label style={styles.label}>
                <span style={styles.labelIcon}>🗺️</span>
                จังหวัด
              </label>
              <input
                type="text"
                placeholder="จังหวัด"
                value={formData.province}
                onChange={(e) => handleChange('province', e.target.value)}
                style={{
                  ...styles.input,
                  ...(isEditMode ? styles.inputEnabled : styles.inputDisabled)
                }}
                disabled={!isEditMode}
              />
            </div>
          </div>

          <div style={styles.fieldGroup}>
            <label style={styles.label}>
              <span style={styles.labelIcon}>📮</span>
              รหัสไปรษณีย์
            </label>
            <input
              type="text"
              placeholder="10XXX"
              value={formData.postalCode}
              onChange={(e) => handleChange('postalCode', e.target.value)}
              style={{
                ...styles.input,
                ...(isEditMode ? styles.inputEnabled : styles.inputDisabled)
              }}
              disabled={!isEditMode}
              maxLength="5"
            />
          </div>
          
          {isEditMode && (
            <div style={styles.buttonGroup}>
              <button 
                type="button"
                style={styles.cancelButton}
                onClick={handleCancel}
                disabled={saving}
                onMouseEnter={(e) => !saving && (e.target.style.backgroundColor = '#f5f5f5')}
                onMouseLeave={(e) => !saving && (e.target.style.backgroundColor = '#fff')}
              >
                ✕ ยกเลิก
              </button>
              <button 
                type="submit" 
                style={{
                  ...styles.saveButton,
                  ...(saving ? styles.saveButtonDisabled : {})
                }}
                disabled={saving}
                onMouseEnter={(e) => !saving && (e.target.style.backgroundColor = '#27ae60')}
                onMouseLeave={(e) => !saving && (e.target.style.backgroundColor = '#2ecc71')}
              >
                {saving ? (
                  <>
                    <span style={styles.spinner}>⏳</span>
                    กำลังบันทึก...
                  </>
                ) : (
                  <>✓ บันทึกข้อมูล</>
                )}
              </button>
            </div>
          )}
        </form>
      </div>
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

const styles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'flex-start',
    minHeight: 'calc(100vh - 60px)',
    backgroundColor: '#f0f2f5',
    padding: '2rem 1rem',
    fontFamily: '"Inter", "Segoe UI", Tahoma, sans-serif',
  },
  loadingBox: {
    textAlign: 'center',
    padding: '3rem',
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
  },
  card: {
    backgroundColor: 'white',
    padding: '2.5rem',
    borderRadius: '12px',
    boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
    width: '100%',
    maxWidth: '700px',
    marginTop: '1rem',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '2rem',
    paddingBottom: '1.25rem',
    borderBottom: '2px solid #e0e0e0',
  },
  backButton: {
    backgroundColor: 'transparent',
    color: '#007bff',
    border: 'none',
    padding: '0.5rem 0',
    cursor: 'pointer',
    fontSize: '0.9rem',
    fontWeight: '600',
    marginBottom: '0.5rem',
    transition: 'color 0.2s',
  },
  title: {
    margin: 0,
    color: '#1a1a1a',
    fontSize: '1.75rem',
    fontWeight: '700',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  titleIcon: {
    fontSize: '1.85rem',
  },
  editButton: {
    backgroundColor: '#ee4d2d',
    color: 'white',
    border: 'none',
    padding: '0.75rem 1.5rem',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '0.95rem',
    fontWeight: '600',
    transition: 'all 0.3s ease',
    boxShadow: '0 2px 6px rgba(238, 77, 45, 0.3)',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  btnIcon: {
    fontSize: '1rem',
  },
  messageBox: {
    padding: '1rem 1.25rem',
    borderRadius: '8px',
    marginBottom: '1.5rem',
    fontSize: '0.95rem',
    fontWeight: '600',
    animation: 'slideIn 0.3s ease',
  },
  successBox: {
    backgroundColor: '#d4edda',
    color: '#155724',
    border: '1px solid #c3e6cb',
  },
  errorBox: {
    backgroundColor: '#f8d7da',
    color: '#721c24',
    border: '1px solid #f5c6cb',
  },
  infoSection: {
    backgroundColor: '#f8f9fa',
    padding: '1.25rem',
    borderRadius: '8px',
    marginBottom: '2rem',
    border: '1px solid #e0e0e0',
  },
  infoRow: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '0.75rem',
    gap: '12px',
  },
  infoLabel: {
    fontSize: '0.95rem',
    color: '#666',
    fontWeight: '500',
    minWidth: '140px',
  },
  infoValue: {
    fontSize: '0.95rem',
    color: '#1a1a1a',
    fontWeight: '600',
  },
  tierBadge: {
    padding: '0.25rem 0.75rem',
    borderRadius: '12px',
    fontSize: '0.875rem',
    fontWeight: '500',
    display: 'inline-block',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginTop: '0.5rem',
    paddingBottom: '0.75rem',
    borderBottom: '2px solid #f0f0f0',
  },
  sectionIcon: {
    fontSize: '1.25rem',
  },
  sectionTitle: {
    fontSize: '1.1rem',
    fontWeight: '700',
    color: '#333',
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
    flex: 1,
  },
  formRow: {
    display: 'flex',
    gap: '1rem',
  },
  label: {
    fontSize: '0.9rem',
    color: '#555',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  labelIcon: {
    fontSize: '1rem',
  },
  required: {
    color: '#ee4d2d',
    marginLeft: '4px',
  },
  input: {
    padding: '0.85rem',
    border: '2px solid #e0e0e0',
    borderRadius: '8px',
    fontSize: '0.95rem',
    outline: 'none',
    transition: 'all 0.3s ease',
    fontFamily: 'inherit',
  },
  inputEnabled: {
    backgroundColor: '#fff',
    borderColor: '#e0e0e0',
  },
  textarea: {
    padding: '0.85rem',
    border: '2px solid #e0e0e0',
    borderRadius: '8px',
    fontSize: '0.95rem',
    outline: 'none',
    transition: 'all 0.3s ease',
    fontFamily: 'inherit',
    resize: 'vertical',
  },
  inputDisabled: {
    backgroundColor: '#f8f9fa',
    cursor: 'not-allowed',
    color: '#495057',
    borderColor: '#dee2e6',
  },
  buttonGroup: {
    display: 'flex',
    gap: '1rem',
    marginTop: '1.5rem',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#2ecc71',
    color: 'white',
    border: 'none',
    padding: '1rem',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '1rem',
    fontWeight: '700',
    transition: 'all 0.3s ease',
    boxShadow: '0 2px 6px rgba(46, 204, 113, 0.3)',
  },
  saveButtonDisabled: {
    backgroundColor: '#95a5a6',
    cursor: 'not-allowed',
    opacity: 0.7,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#fff',
    color: '#666',
    border: '2px solid #e0e0e0',
    padding: '1rem',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '1rem',
    fontWeight: '700',
    transition: 'all 0.3s ease',
  },
  spinner: {
    display: 'inline-block',
    animation: 'spin 1s linear infinite',
  },
};

const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  
  input:focus:not(:disabled), textarea:focus:not(:disabled) {
    border-color: #2196f3 !important;
    box-shadow: 0 0 0 3px rgba(33, 150, 243, 0.1) !important;
  }
`;
document.head.appendChild(styleSheet);

export default MemberProfile;