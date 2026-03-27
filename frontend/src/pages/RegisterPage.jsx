import { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';

const RegisterPage = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [address, setAddress] = useState('');
    const [district, setDistrict] = useState('');
    const [province, setProvince] = useState('');
    const [postalCode, setPostalCode] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { register, loginWithGoogle, setUser } = useContext(AuthContext);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (password !== confirmPassword) {
            alert('รหัสผ่านไม่ตรงกัน');
            return;
        }

        if (password.length < 6) {
            alert('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร');
            return;
        }

        setIsSubmitting(true);

        try {
            // ✅ เรียก register function จาก AuthContext
            const response = await register(email, password, name, phone, address, district, province, postalCode);
            
            console.log('📥 Register response:', response);

            // ✅ หลังจาก register สำเร็จ ให้ดึงข้อมูล user ล่าสุดจาก backend
            const token = localStorage.getItem('token');
            if (token) {
                try {
                    const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';
                    const userResponse = await axios.get(`${API_BASE}/api/auth/me`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });

                    if (userResponse.data.success && userResponse.data.user) {
                        const userData = userResponse.data.user;
                        
                        console.log('✅ User data fetched after registration:', userData);

                        // ✅ อัปเดท Context
                        setUser(userData);

                        // ✅ อัปเดท localStorage
                        localStorage.setItem('user', JSON.stringify(userData));
                    }
                } catch (fetchError) {
                    console.error('⚠️ Could not fetch user data after registration:', fetchError);
                }
            }

            alert('สมัครสมาชิกสำเร็จ! ยินดีต้อนรับ');
            navigate('/');
            
        } catch (error) {
            console.error('❌ Register error:', error);
            
            let errorMessage = 'เกิดข้อผิดพลาดในการสมัครสมาชิก';
            
            if (error.response?.data?.message) {
                errorMessage = error.response.data.message;
            } else if (error.message) {
                errorMessage = error.message;
            }
            
            // ตรวจสอบข้อผิดพลาดเฉพาะ
            if (errorMessage.includes('email already exists') || errorMessage.includes('อีเมลนี้ถูกใช้แล้ว')) {
                errorMessage = 'อีเมลนี้ถูกใช้งานแล้ว กรุณาใช้อีเมลอื่น';
            } else if (errorMessage.includes('auth/email-already-in-use')) {
                errorMessage = 'อีเมลนี้ถูกใช้งานแล้ว';
            }
            
            alert(errorMessage);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleGoogleSignup = async () => {
        try {
            const response = await loginWithGoogle();
            
            console.log('📥 Google signup response:', response);

            // ✅ หลังจาก Google login สำเร็จ ให้ดึงข้อมูล user ล่าสุด
            const token = localStorage.getItem('token');
            if (token) {
                try {
                    const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';
                    const userResponse = await axios.get(`${API_BASE}/api/auth/me`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });

                    if (userResponse.data.success && userResponse.data.user) {
                        const userData = userResponse.data.user;
                        
                        console.log('✅ User data fetched after Google login:', userData);

                        // ✅ อัปเดท Context
                        setUser(userData);

                        // ✅ อัปเดท localStorage
                        localStorage.setItem('user', JSON.stringify(userData));
                    }
                } catch (fetchError) {
                    console.error('⚠️ Could not fetch user data after Google login:', fetchError);
                }
            }

            navigate('/');
        } catch (error) {
            console.error('❌ Google signup error:', error);
            let errorMessage = 'ไม่สามารถสมัครด้วย Google ได้';
            
            if (error.code === 'auth/popup-closed-by-user') {
                errorMessage = 'คุณปิดหน้าต่าง Google Login';
            } else if (error.code === 'auth/popup-blocked') {
                errorMessage = 'เบราว์เซอร์บลอก popup กรุณาอนุญาต popup';
            } else if (error.code === 'auth/account-exists-with-different-credential') {
                errorMessage = 'อีเมลนี้ถูกใช้งานแล้วด้วยวิธีการเข้าสู่ระบบอื่น';
            } else if (error.message) {
                errorMessage = error.message;
            }
            
            alert(errorMessage);
        }
    };

    const handleFacebookSignup = () => {
        alert('Facebook Login กำลังพัฒนา');
        // TODO: Implement Facebook Login
    };

    const handleLineSignup = () => {
        alert('LINE Login กำลังพัฒนา');
        // TODO: Implement LINE Login
    };

    return (
        <div style={styles.container}>
            <div style={styles.card}>
                <h2 style={styles.title}>
                    <span style={styles.titleIcon}>🚀</span>
                    สมัครสมาชิก
                </h2>
                
                {/* Social Login Buttons */}
                <div style={styles.socialButtons}>
                    <button 
                        onClick={handleGoogleSignup} 
                        style={styles.googleButton}
                        onMouseEnter={(e) => e.target.style.transform = 'translateY(-2px)'}
                        onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
                    >
                        <svg style={styles.icon} viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                        </svg>
                        ลงทะเบียนด้วย Google
                    </button>

                    <button 
                        onClick={handleFacebookSignup} 
                        style={styles.facebookButton}
                        onMouseEnter={(e) => e.target.style.transform = 'translateY(-2px)'}
                        onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
                    >
                        <svg style={styles.icon} viewBox="0 0 24 24" fill="white">
                            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                        </svg>
                        ลงทะเบียนด้วย Facebook
                    </button>

                    <button 
                        onClick={handleLineSignup} 
                        style={styles.lineButton}
                        onMouseEnter={(e) => e.target.style.transform = 'translateY(-2px)'}
                        onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
                    >
                        <svg style={styles.icon} viewBox="0 0 24 24" fill="white">
                            <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/>
                        </svg>
                        ลงทะเบียนด้วย LINE
                    </button>
                </div>

                <div style={styles.divider}>
                    <div style={styles.dividerLine}></div>
                    <span style={styles.dividerText}>หรือ</span>
                    <div style={styles.dividerLine}></div>
                </div>

                <form onSubmit={handleSubmit} style={styles.form}>
                    <div style={styles.sectionTitle}>
                        <span style={styles.sectionIcon}>📝</span>
                        ข้อมูลส่วนตัว
                    </div>
                    
                    <div style={styles.fieldGroup}>
                        <input
                            type="text"
                            placeholder="ชื่อ-นามสกุล *"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            style={styles.input}
                            required
                        />
                    </div>

                    <div style={styles.fieldGroup}>
                        <input
                            type="email"
                            placeholder="อีเมล *"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            style={styles.input}
                            required
                        />
                    </div>

                    <div style={styles.fieldGroup}>
                        <input
                            type="tel"
                            placeholder="เบอร์โทรศัพท์ * (10 หลัก)"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            style={styles.input}
                            maxLength="10"
                            pattern="[0-9]{10}"
                            required
                        />
                    </div>
                    
                    <div style={styles.sectionTitle}>
                        <span style={styles.sectionIcon}>📍</span>
                        ที่อยู่จัดส่ง
                    </div>
                    
                    <div style={styles.fieldGroup}>
                        <textarea
                            placeholder="ที่อยู่ (บ้านเลขที่, ซอย, ถนน)"
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                            style={{...styles.input, minHeight: '80px', resize: 'vertical'}}
                        />
                    </div>

                    <div style={styles.rowFields}>
                        <input
                            type="text"
                            placeholder="เขต/อำเภอ"
                            value={district}
                            onChange={(e) => setDistrict(e.target.value)}
                            style={styles.input}
                        />
                        <input
                            type="text"
                            placeholder="จังหวัด"
                            value={province}
                            onChange={(e) => setProvince(e.target.value)}
                            style={styles.input}
                        />
                    </div>

                    <div style={styles.fieldGroup}>
                        <input
                            type="text"
                            placeholder="รหัสไปรษณีย์ (5 หลัก)"
                            value={postalCode}
                            onChange={(e) => setPostalCode(e.target.value)}
                            style={styles.input}
                            maxLength="5"
                            pattern="[0-9]{5}"
                        />
                    </div>
                    
                    <div style={styles.sectionTitle}>
                        <span style={styles.sectionIcon}>🔒</span>
                        รหัสผ่าน
                    </div>
                    
                    <div style={styles.fieldGroup}>
                        <input
                            type="password"
                            placeholder="รหัสผ่าน * (อย่างน้อย 6 ตัวอักษร)"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            style={styles.input}
                            minLength="6"
                            required
                        />
                    </div>

                    <div style={styles.fieldGroup}>
                        <input
                            type="password"
                            placeholder="ยืนยันรหัสผ่าน *"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            style={styles.input}
                            required
                        />
                    </div>

                    <button 
                        type="submit" 
                        style={{
                            ...styles.button,
                            ...(isSubmitting ? styles.buttonDisabled : {})
                        }}
                        disabled={isSubmitting}
                        onMouseEnter={(e) => !isSubmitting && (e.target.style.backgroundColor = '#d63c1e')}
                        onMouseLeave={(e) => !isSubmitting && (e.target.style.backgroundColor = '#ee4d2d')}
                    >
                        {isSubmitting ? (
                            <>
                                <span style={styles.spinner}>⏳</span>
                                กำลังสมัครสมาชิก...
                            </>
                        ) : (
                            <>✓ สมัครสมาชิก</>
                        )}
                    </button>
                </form>

                <p style={styles.text}>
                    มีบัญชีแล้ว? <Link to="/login" style={styles.link}>เข้าสู่ระบบ</Link>
                </p>
            </div>
        </div>
    );
};

const styles = {
    container: {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: 'calc(100vh - 60px)',
        backgroundColor: '#f0f2f5',
        padding: '2rem 1rem',
        fontFamily: '"Inter", "Segoe UI", Tahoma, sans-serif',
    },
    card: {
        backgroundColor: 'white',
        padding: '2.5rem',
        borderRadius: '16px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
        width: '100%',
        maxWidth: '550px',
        maxHeight: '90vh',
        overflowY: 'auto',
    },
    title: {
        textAlign: 'center',
        marginBottom: '2rem',
        color: '#1a1a1a',
        fontSize: '1.85rem',
        fontWeight: '700',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '10px',
    },
    titleIcon: {
        fontSize: '2rem',
    },
    socialButtons: {
        display: 'flex',
        flexDirection: 'column',
        gap: '0.85rem',
        marginBottom: '1.5rem',
    },
    googleButton: {
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.75rem',
        backgroundColor: 'white',
        border: '2px solid #e0e0e0',
        padding: '0.85rem',
        borderRadius: '10px',
        cursor: 'pointer',
        fontSize: '0.95rem',
        fontWeight: '600',
        transition: 'all 0.3s ease',
        boxShadow: '0 2px 6px rgba(0,0,0,0.05)',
    },
    facebookButton: {
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.75rem',
        backgroundColor: '#1877F2',
        color: 'white',
        border: 'none',
        padding: '0.85rem',
        borderRadius: '10px',
        cursor: 'pointer',
        fontSize: '0.95rem',
        fontWeight: '600',
        transition: 'all 0.3s ease',
        boxShadow: '0 2px 6px rgba(24, 119, 242, 0.3)',
    },
    lineButton: {
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.75rem',
        backgroundColor: '#00B900',
        color: 'white',
        border: 'none',
        padding: '0.85rem',
        borderRadius: '10px',
        cursor: 'pointer',
        fontSize: '0.95rem',
        fontWeight: '600',
        transition: 'all 0.3s ease',
        boxShadow: '0 2px 6px rgba(0, 185, 0, 0.3)',
    },
    icon: {
        width: '22px',
        height: '22px',
    },
    divider: {
        display: 'flex',
        alignItems: 'center',
        margin: '1.75rem 0',
        gap: '1rem',
    },
    dividerLine: {
        flex: 1,
        height: '1px',
        backgroundColor: '#e0e0e0',
    },
    dividerText: {
        color: '#999',
        fontSize: '0.9rem',
        fontWeight: '500',
    },
    form: {
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
    },
    sectionTitle: {
        fontSize: '1rem',
        fontWeight: '700',
        color: '#333',
        marginTop: '0.75rem',
        marginBottom: '0.25rem',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        paddingBottom: '0.5rem',
        borderBottom: '2px solid #f0f0f0',
    },
    sectionIcon: {
        fontSize: '1.15rem',
    },
    fieldGroup: {
        display: 'flex',
        flexDirection: 'column',
    },
    rowFields: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '1rem',
    },
    input: {
        padding: '0.9rem',
        border: '2px solid #e0e0e0',
        borderRadius: '10px',
        fontSize: '0.95rem',
        outline: 'none',
        transition: 'all 0.3s ease',
        fontFamily: 'inherit',
    },
    button: {
        backgroundColor: '#ee4d2d',
        color: 'white',
        border: 'none',
        padding: '1rem',
        borderRadius: '10px',
        cursor: 'pointer',
        fontSize: '1rem',
        fontWeight: '700',
        transition: 'all 0.3s ease',
        marginTop: '1rem',
        boxShadow: '0 4px 12px rgba(238, 77, 45, 0.3)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
    },
    buttonDisabled: {
        backgroundColor: '#cccccc',
        cursor: 'not-allowed',
        opacity: 0.7,
    },
    spinner: {
        display: 'inline-block',
        animation: 'spin 1s linear infinite',
    },
    text: {
        textAlign: 'center',
        marginTop: '1.5rem',
        color: '#666',
        fontSize: '0.95rem',
    },
    link: {
        color: '#ee4d2d',
        textDecoration: 'none',
        fontWeight: '600',
        transition: 'color 0.2s ease',
    },
};

// Add CSS animations
const styleSheet = document.createElement('style');
styleSheet.textContent = `
    @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
    }
    
    input:focus, textarea:focus {
        border-color: #2196f3 !important;
        box-shadow: 0 0 0 3px rgba(33, 150, 243, 0.1) !important;
    }
    
    @media (max-width: 640px) {
        .rowFields {
            grid-template-columns: 1fr !important;
        }
    }
`;
document.head.appendChild(styleSheet);

export default RegisterPage;