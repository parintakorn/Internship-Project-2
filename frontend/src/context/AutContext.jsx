import { createContext, useState, useEffect } from 'react';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [token, setToken] = useState(null);

    useEffect(() => {
    const verifyToken = async () => {
        try {
            const savedToken = localStorage.getItem('token');
            if (!savedToken) { setLoading(false); return; }

            const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';
            const response = await fetch(`${API_BASE}/api/auth/me`, {
                headers: { 'Authorization': `Bearer ${savedToken}` }
            });

            if (!response.ok) {
                localStorage.removeItem('token');
                setLoading(false);
                return;
            }

            const data = await response.json();
            setToken(savedToken);
            setUser(data.user); // ← ได้จาก backend เสมอ

        } catch (error) {
            localStorage.removeItem('token');
        } finally {
            setLoading(false);
        }
    };
    verifyToken();
}, []);

    // ฟังก์ชัน login
    const login = async (email, password) => {
        try {
            setLoading(true);
            const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';
            const response = await fetch(`${API_BASE}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();
            
            console.log('📥 Login response:', data);

            if (!response.ok) {
                throw new Error(data.message || 'Login failed');
            }

            if (data.token) {
                localStorage.setItem('token', data.token);
                setToken(data.token);
            }

            // ⭐ แก้ตรงนี้ - รับข้อมูลครบถ้วนจาก Backend
            const userData = {
                user_id: data.user?.user_id || data.userId,
                email: data.user?.email || email,
                role: data.user?.role || data.role || 'customer',
                name: data.user?.name || email.split('@')[0],
                phone: data.user?.phone || '',
                address: data.user?.address || '',
                district: data.user?.district || '',
                province: data.user?.province || '',
                postal_code: data.user?.postal_code || '',
                created_at: data.user?.created_at || new Date().toISOString()
            };

            console.log('✅ Processed userData:', userData);

            setUser(userData);
            return userData;
        } catch (error) {
            console.error('❌ Login error:', error);
            throw error;
        } finally {
            setLoading(false);
        }
    };

    // ฟังก์ชัน logout
    const logout = () => {
        try {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            setToken(null);
            setUser(null);
            console.log('✅ User logged out');
        } catch (error) {
            console.error('❌ Logout error:', error);
        }
    };

    // ฟังก์ชัน register
    // ✅ แก้เป็น — รับครบทุก field และส่งไปยัง API ด้วย
const register = async (email, password, name = '', phone = '', address = '', district = '', province = '', postalCode = '') => {
    try {
        setLoading(true);
        const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';
        const response = await fetch(`${API_BASE}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email,
                password,
                name,
                phone,
                address,
                district,
                province,
                postal_code: postalCode   // ← แปลง camelCase → snake_case ให้ตรง backend
            })
        });

        const data = await response.json();
        
        console.log('📥 Register response:', data);

        if (!response.ok) {
            throw new Error(data.message || 'Registration failed');
        }

        if (data.token) {
            localStorage.setItem('token', data.token);
            setToken(data.token);
        }

        const userData = {
            user_id: data.user?.user_id || data.userId,
            email: data.user?.email || email,
            role: data.user?.role || data.role || 'customer',
            name: data.user?.name || name || email.split('@')[0],
            phone: data.user?.phone || phone,
            address: data.user?.address || address,
            district: data.user?.district || district,
            province: data.user?.province || province,
            postal_code: data.user?.postal_code || postalCode,
            created_at: data.user?.created_at || new Date().toISOString()
        };

        console.log('✅ Processed userData:', userData);

        localStorage.setItem('user', JSON.stringify(userData));
        setUser(userData);
        return userData;
    } catch (error) {
        console.error('❌ Register error:', error);
        throw error;
    } finally {
        setLoading(false);
    }
};

    // ฟังก์ชัน Social Logins
    const loginWithGoogle = async (googleData) => {
        try {
            setLoading(true);
            const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';
            const response = await fetch(`${API_BASE}/api/auth/google`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(googleData)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Google login failed');
            }

            if (data.token) {
                localStorage.setItem('token', data.token);
                setToken(data.token);
            }

            const userData = {
                user_id: data.user?.user_id,
                email: data.user?.email,
                role: data.user?.role || 'customer',
                name: data.user?.name,
                phone: data.user?.phone || '',
                address: data.user?.address || '',
                district: data.user?.district || '',
                province: data.user?.province || '',
                postal_code: data.user?.postal_code || ''
            };

            localStorage.setItem('user', JSON.stringify(userData));
            setUser(userData);
            return userData;
        } catch (error) {
            console.error('❌ Google login error:', error);
            throw error;
        } finally {
            setLoading(false);
        }
    };

    const loginWithFacebook = async (facebookData) => {
        try {
            setLoading(true);
            const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';
            const response = await fetch(`${API_BASE}/api/auth/facebook`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(facebookData)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Facebook login failed');
            }

            if (data.token) {
                localStorage.setItem('token', data.token);
                setToken(data.token);
            }

            const userData = {
                user_id: data.user?.user_id,
                email: data.user?.email,
                role: data.user?.role || 'customer',
                name: data.user?.name,
                phone: data.user?.phone || '',
                address: data.user?.address || '',
                district: data.user?.district || '',
                province: data.user?.province || '',
                postal_code: data.user?.postal_code || ''
            };

            localStorage.setItem('user', JSON.stringify(userData));
            setUser(userData);
            return userData;
        } catch (error) {
            console.error('❌ Facebook login error:', error);
            throw error;
        } finally {
            setLoading(false);
        }
    };

    const loginWithLine = async (lineData) => {
        try {
            setLoading(true);
            const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';
            const response = await fetch(`${API_BASE}/api/auth/line`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(lineData)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'LINE login failed');
            }

            if (data.token) {
                localStorage.setItem('token', data.token);
                setToken(data.token);
            }

            const userData = {
                user_id: data.user?.user_id,
                email: data.user?.email,
                role: data.user?.role || 'customer',
                name: data.user?.name,
                phone: data.user?.phone || '',
                address: data.user?.address || '',
                district: data.user?.district || '',
                province: data.user?.province || '',
                postal_code: data.user?.postal_code || ''
            };

            localStorage.setItem('user', JSON.stringify(userData));
            setUser(userData);
            return userData;
        } catch (error) {
            console.error('❌ LINE login error:', error);
            throw error;
        } finally {
            setLoading(false);
        }
    };

    // ⭐ ฟังก์ชัน updateProfile - แก้ใหม่
    const updateProfile = async (updates) => {
        try {
            setLoading(true);
            const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

            const response = await fetch(`${API_BASE}/api/auth/profile`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(updates)
            });

            const data = await response.json();

            console.log('📥 Update profile response:', data);

            if (!response.ok) {
                throw new Error(data.message || 'Update failed');
            }

            // ⭐ ใช้ข้อมูลจาก Backend response แทนการ merge
            const updatedUser = data.user || {
                ...user,
                ...updates
            };

            console.log('✅ Updated user data:', updatedUser);

            // บันทึกลง LocalStorage
            localStorage.setItem('user', JSON.stringify(updatedUser));
            
            // อัปเดต State
            setUser(updatedUser);

            return updatedUser;
        } catch (error) {
            console.error('❌ Update profile error:', error);
            throw error;
        } finally {
            setLoading(false);
        }
    };

    const value = {
        user,
        setUser,
        token,
        loading,
        login,
        logout,
        register,
        loginWithGoogle,
        loginWithFacebook,
        loginWithLine,
        updateProfile,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
