import { useState, useContext, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

// ✅ แก้: ใช้วิธีที่ถูกต้อง
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const LoginPage = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const { login, loginWithGoogle, loginWithFacebook, loginWithLine, user } = useContext(AuthContext);
    const navigate = useNavigate();

    // Redirect ตาม role
    useEffect(() => {
        if (user) {
            console.log('User found:', user.role);
            if (user.role === 'admin') {
                navigate('/admin/dashboard');
            } else {
                navigate('/');
            }
        }
    }, [user, navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        
        try {
            console.log('Attempting login with:', email);
            console.log('API_BASE:', API_BASE);
            
            // ✅ แก้: ใช้ API_BASE + /api/auth/login
            const response = await fetch(`${API_BASE}/api/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: email.trim(),
                    password: password
                })
            });

            const data = await response.json();
            console.log('Login response:', data);

            if (!response.ok) {
                throw new Error(data.message || 'เข้าสู่ระบบไม่สำเร็จ');
            }

            // ถ้าสำเร็จ เก็บข้อมูล
            if (data.token) {
                localStorage.setItem('token', data.token);
                
                const userData = {
                    user_id: data.user.user_id,
                    email: data.user.email,
                    role: data.user.role || 'customer',
                    name: data.user.name || data.user.email.split('@')[0]
                };
                
                localStorage.setItem('user', JSON.stringify(userData));
                
                // อัพเดท context
                await login(email, password);
                
                console.log('Login successful');
                setError('');
                
                // Redirect
                if (userData.role === 'admin') {
                    navigate('/admin/dashboard');
                } else {
                    navigate('/');
                }
            }
            
        } catch (error) {
            console.error('Login error:', error);
            const errorMsg = error.message || 'อีเมลหรือรหัสผ่านไม่ถูกต้อง';
            setError('❌ ' + errorMsg);
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        setError('');
        try {
            console.log('Google login clicked');
            await loginWithGoogle();
        } catch (error) {
            console.error('Google login error:', error);
            
            let errorMessage = 'ไม่สามารถเข้าสู่ระบบด้วย Google ได้';
            
            if (error.code === 'auth/popup-closed-by-user') {
                errorMessage = 'คุณปิดหน้าต่าง Google Login';
            } else if (error.code === 'auth/popup-blocked') {
                errorMessage = 'เบราว์เซอร์บลอก popup กรุณาอนุญาต popup';
            } else if (error.message) {
                errorMessage = error.message;
            }
            
            setError('❌ ' + errorMessage);
        }
    };

    const handleFacebookLogin = async () => {
        setError('');
        try {
            console.log('Facebook login clicked');
            await loginWithFacebook();
        } catch (error) {
            console.error('Facebook login error:', error);
            
            let errorMessage = 'ไม่สามารถเข้าสู่ระบบด้วย Facebook ได้';
            
            if (error.code === 'auth/popup-closed-by-user') {
                errorMessage = 'คุณปิดหน้าต่าง Facebook Login';
            } else if (error.code === 'auth/popup-blocked') {
                errorMessage = 'เบราว์เซอร์บลอก popup กรุณาอนุญาต popup';
            } else if (error.code === 'auth/account-exists-with-different-credential') {
                errorMessage = 'อีเมลนี้ถูกใช้กับวิธีเข้าสู่ระบบอื่นแล้ว';
            } else if (error.message) {
                errorMessage = error.message;
            }
            
            setError('❌ ' + errorMessage);
        }
    };

    const handleLineLogin = async () => {
        setError('');
        try {
            console.log('LINE login clicked');
            await loginWithLine();
        } catch (error) {
            console.error('LINE login error:', error);
            
            let errorMessage = 'ไม่สามารถเข้าสู่ระบบด้วย LINE ได้';
            
            if (error.code === 'auth/popup-closed-by-user') {
                errorMessage = 'คุณปิดหน้าต่าง LINE Login';
            } else if (error.code === 'auth/popup-blocked') {
                errorMessage = 'เบราว์เซอร์บลอก popup กรุณาอนุญาต popup';
            } else if (error.code === 'auth/account-exists-with-different-credential') {
                errorMessage = 'อีเมลนี้ถูกใช้กับวิธีเข้าสู่ระบบอื่นแล้ว';
            } else if (error.message) {
                errorMessage = error.message;
            }
            
            setError('❌ ' + errorMessage);
        }
    };

    return (
        <div style={styles.container}>
            <div style={styles.card}>
                <h2 style={styles.title}>🔐 เข้าสู่ระบบ</h2>
                
                {error && <div style={styles.errorBox}>{error}</div>}
                
                <button 
                    onClick={handleGoogleLogin} 
                    style={styles.googleButton}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                >
                    <svg style={styles.googleIcon} viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    เข้าสู่ระบบด้วย Google
                </button>

                <button 
                    onClick={handleFacebookLogin} 
                    style={styles.facebookButton}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#166fe5'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#1877F2'}
                >
                    <svg style={styles.facebookIcon} viewBox="0 0 24 24">
                        <path fill="#FFFFFF" d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                    เข้าสู่ระบบด้วย Facebook
                </button>

                <button 
                    onClick={handleLineLogin} 
                    style={styles.lineButton}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#05b048'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#06C755'}
                >
                    <svg style={styles.lineIcon} viewBox="0 0 24 24">
                        <path fill="#FFFFFF" d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/>
                    </svg>
                    เข้าสู่ระบบด้วย LINE
                </button>

                <div style={styles.divider}>
                    <div style={styles.dividerLine}></div>
                    <span style={styles.dividerText}>หรือ</span>
                    <div style={styles.dividerLine}></div>
                </div>

                <form onSubmit={handleSubmit} style={styles.form}>
                    <div style={styles.inputGroup}>
                        <label style={styles.label}>อีเมล</label>
                        <input
                            type="email"
                            placeholder="กรอกอีเมลของคุณ"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            style={styles.input}
                            required
                            disabled={loading}
                        />
                    </div>
                    
                    <div style={styles.inputGroup}>
                        <label style={styles.label}>รหัสผ่าน</label>
                        <input
                            type="password"
                            placeholder="กรอกรหัสผ่าน"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            style={styles.input}
                            required
                            disabled={loading}
                        />
                    </div>

                    <button 
                        type="submit" 
                        style={{
                            ...styles.button,
                            opacity: loading ? 0.7 : 1,
                            cursor: loading ? 'not-allowed' : 'pointer'
                        }}
                        disabled={loading}
                        onMouseEnter={(e) => {
                            if (!loading) e.currentTarget.style.backgroundColor = '#d43d1f';
                        }}
                        onMouseLeave={(e) => {
                            if (!loading) e.currentTarget.style.backgroundColor = '#ee4d2d';
                        }}
                    >
                        {loading ? '⏳ กำลังเข้าสู่ระบบ...' : '🔓 เข้าสู่ระบบ'}
                    </button>
                </form>

                <div style={styles.footer}>
                    <Link to="/forgot-password" style={styles.forgotLink}>
                        ลืมรหัสผ่าน?
                    </Link>
                </div>

                <p style={styles.text}>
                    ยังไม่มีบัญชี? <Link to="/register" style={styles.link}>สมัครสมาชิกเลย</Link>
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
        backgroundColor: '#f5f5f5',
        padding: '1rem',
    },
    card: {
        backgroundColor: 'white',
        padding: '2.5rem',
        borderRadius: '12px',
        boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
        width: '100%',
        maxWidth: '420px',
    },
    title: {
        textAlign: 'center',
        marginBottom: '1.5rem',
        color: '#333',
        fontSize: '1.8rem',
        fontWeight: 'bold',
    },
    errorBox: {
        backgroundColor: '#fee',
        border: '2px solid #f44',
        color: '#c33',
        padding: '0.75rem',
        borderRadius: '6px',
        marginBottom: '1rem',
        fontSize: '0.9rem',
        fontWeight: '500',
        whiteSpace: 'pre-line',
    },
    googleButton: {
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.75rem',
        backgroundColor: 'white',
        border: '2px solid #ddd',
        padding: '0.85rem',
        borderRadius: '8px',
        cursor: 'pointer',
        fontSize: '1rem',
        fontWeight: '500',
        transition: 'all 0.2s',
        marginTop: '1rem',
    },
    googleIcon: {
        width: '20px',
        height: '20px',
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
        borderRadius: '8px',
        cursor: 'pointer',
        fontSize: '1rem',
        fontWeight: '500',
        transition: 'all 0.2s',
        marginTop: '0.75rem',
    },
    facebookIcon: {
        width: '20px',
        height: '20px',
    },
    lineButton: {
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.75rem',
        backgroundColor: '#06C755',
        color: 'white',
        border: 'none',
        padding: '0.85rem',
        borderRadius: '8px',
        cursor: 'pointer',
        fontSize: '1rem',
        fontWeight: '500',
        transition: 'all 0.2s',
        marginTop: '0.75rem',
    },
    lineIcon: {
        width: '20px',
        height: '20px',
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
        backgroundColor: '#ddd',
    },
    dividerText: {
        color: '#999',
        fontSize: '0.9rem',
        fontWeight: '500',
    },
    form: {
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem',
    },
    inputGroup: {
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
    },
    label: {
        fontSize: '0.9rem',
        fontWeight: '600',
        color: '#555',
    },
    input: {
        padding: '0.85rem',
        border: '2px solid #e0e0e0',
        borderRadius: '8px',
        fontSize: '1rem',
        outline: 'none',
        transition: 'all 0.2s',
        backgroundColor: 'white',
    },
    button: {
        backgroundColor: '#ee4d2d',
        color: 'white',
        border: 'none',
        padding: '0.9rem',
        borderRadius: '8px',
        cursor: 'pointer',
        fontSize: '1rem',
        fontWeight: 'bold',
        transition: 'all 0.2s',
        marginTop: '0.5rem',
        boxShadow: '0 2px 8px rgba(238, 77, 45, 0.3)',
    },
    footer: {
        textAlign: 'center',
        marginTop: '1rem',
    },
    forgotLink: {
        color: '#ee4d2d',
        textDecoration: 'none',
        fontSize: '0.9rem',
        fontWeight: '500',
        transition: 'color 0.2s',
    },
    text: {
        textAlign: 'center',
        marginTop: '1.5rem',
        color: '#666',
        fontSize: '0.95rem',
        paddingTop: '1rem',
        borderTop: '1px solid #f0f0f0',
    },
    link: {
        color: '#ee4d2d',
        textDecoration: 'none',
        fontWeight: '600',
        transition: 'color 0.2s',
    },
};

// CSS สำหรับ focus states
if (typeof document !== 'undefined') {
    const style = document.createElement('style');
    style.textContent = `
        input:focus {
            border-color: #ee4d2d !important;
            box-shadow: 0 0 0 3px rgba(238, 77, 45, 0.1) !important;
        }
        
        input:disabled {
            background-color: #f5f5f5 !important;
            cursor: not-allowed !important;
        }
        
        a:hover {
            text-decoration: underline !important;
        }
    `;
    document.head.appendChild(style);
}

export default LoginPage;