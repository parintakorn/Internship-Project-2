import { useState, useContext, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';

const ProfilePage = () => {
    const { user, setUser, token } = useContext(AuthContext);
    const navigate = useNavigate();
    const isInitialMount = useRef(true);
    
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        address: '',
        district: '',
        province: '',
        postalCode: ''
    });
    const [loading, setLoading] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    // ✅ ดึงข้อมูลล่าสุดจาก Backend เมื่อเข้าหน้า
    useEffect(() => {
        if (!user) {
            navigate('/login');
            return;
        }

        // ✅ ดึงข้อมูลล่าสุดจาก API
        const fetchUserData = async () => {
            try {
                const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';
                const response = await axios.get(`${API_BASE}/api/auth/me`, {
                    headers: { Authorization: `Bearer ${token}` }
                });

                if (response.data.success && response.data.user) {
                    const latestUser = response.data.user;
                    
                    console.log('✅ Latest user data from backend:', latestUser);

                    // ✅ อัพเดท Context และ localStorage
                    setUser(latestUser);
                    localStorage.setItem('user', JSON.stringify(latestUser));

                    // ✅ อัพเดท formData
                    setFormData({
                        name: latestUser.name || '',
                        phone: latestUser.phone || '',
                        address: latestUser.address || '',
                        district: latestUser.district || '',
                        province: latestUser.province || '',
                        postalCode: latestUser.postal_code || ''
                    });
                }
            } catch (error) {
                console.error('❌ Error fetching user data:', error);
            }
        };

        if (isInitialMount.current) {
            fetchUserData();
            isInitialMount.current = false;
        }
    }, [user?.user_id, token, navigate, setUser]);

    const handleChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage({ type: '', text: '' });

        try {
            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('ไม่พบ Token กรุณาเข้าสู่ระบบใหม่');
            }

            const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';
            
            console.log('📤 Sending update request:', {
                name: formData.name,
                phone: formData.phone,
                address: formData.address,
                district: formData.district,
                province: formData.province,
                postal_code: formData.postalCode
            });

            const response = await axios.put(
                `${API_BASE}/api/auth/profile`,
                {
                    name: formData.name,
                    phone: formData.phone,
                    address: formData.address,
                    district: formData.district,
                    province: formData.province,
                    postal_code: formData.postalCode
                },
                {
                    headers: { Authorization: `Bearer ${token}` }
                }
            );

            console.log('📥 Update response:', response.data);

            if (response.data.success && response.data.user) {
                const updatedUser = response.data.user;
                
                console.log('✅ Updated user from backend:', updatedUser);

                // ✅ อัพเดท Context
                if (setUser) {
                    setUser(updatedUser);
                }

                // ✅ อัพเดท localStorage
                localStorage.setItem('user', JSON.stringify(updatedUser));

                // ✅ อัพเดท formData
                setFormData({
                    name: updatedUser.name || '',
                    phone: updatedUser.phone || '',
                    address: updatedUser.address || '',
                    district: updatedUser.district || '',
                    province: updatedUser.province || '',
                    postalCode: updatedUser.postal_code || ''
                });

                setIsEditMode(false);
                setMessage({ type: 'success', text: '✅ บันทึกข้อมูลสำเร็จ!' });
            } else {
                throw new Error('ไม่ได้รับข้อมูลผู้ใช้จาก Backend');
            }

            setTimeout(() => {
                setMessage({ type: '', text: '' });
            }, 3000);
            
        } catch (error) {
            console.error('❌ Update profile error:', error);
            const errorMessage = error.response?.data?.message || error.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล';
            setMessage({ type: 'error', text: `❌ ${errorMessage}` });

            setTimeout(() => {
                setMessage({ type: '', text: '' });
            }, 5000);
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = () => {
        setFormData({
            name: user.name || '',
            phone: user.phone || '',
            address: user.address || '',
            district: user.district || '',
            province: user.province || '',
            postalCode: user.postal_code || ''
        });
        setIsEditMode(false);
        setMessage({ type: '', text: '' });
    };

    if (!user) return null;

    return (
        <div style={styles.container}>
            <div style={styles.card}>
                <div style={styles.header}>
                    <h2 style={styles.title}>
                        <span style={styles.titleIcon}>👤</span>
                        ข้อมูลส่วนตัว
                    </h2>
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
                        <span style={styles.infoLabel}>📧 อีเมล:</span>
                        <span style={styles.infoValue}>{user.email}</span>
                    </div>
                    <div style={styles.infoRow}>
                        <span style={styles.infoLabel}>🎭 สถานะ:</span>
                        <span style={{
                            ...styles.roleBadge,
                            backgroundColor: user.role === 'admin' ? '#ff9800' : '#4caf50'
                        }}>
                            {user.role === 'admin' ? '👑 ผู้ดูแลระบบ' : '👤 ลูกค้า'}
                        </span>
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
                        <span style={styles.sectionTitle}>ที่อยู่จัดส่ง</span>
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
                                onMouseEnter={(e) => e.target.style.backgroundColor = '#f5f5f5'}
                                onMouseLeave={(e) => e.target.style.backgroundColor = '#fff'}
                                disabled={loading}
                            >
                                ✕ ยกเลิก
                            </button>
                            <button 
                                type="submit" 
                                style={{
                                    ...styles.saveButton,
                                    ...(loading ? styles.saveButtonDisabled : {})
                                }}
                                disabled={loading}
                                onMouseEnter={(e) => !loading && (e.target.style.backgroundColor = '#27ae60')}
                                onMouseLeave={(e) => !loading && (e.target.style.backgroundColor = '#2ecc71')}
                            >
                                {loading ? (
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
            minWidth: '100px',
        },
        infoValue: {
            fontSize: '0.95rem',
            color: '#1a1a1a',
            fontWeight: '600',
        },
        roleBadge: {
            padding: '4px 12px',
            borderRadius: '12px',
            fontSize: '0.85rem',
            fontWeight: '600',
            color: 'white',
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

    export default ProfilePage;