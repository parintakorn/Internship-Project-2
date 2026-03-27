import { useContext, useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

const Navbar = () => {
    const { user, logout } = useContext(AuthContext);
    const { getTotalItems } = useCart();
    const navigate = useNavigate();
    const totalItems = getTotalItems();
    const [showDropdown, setShowDropdown] = useState(false);
    const [showMobileMenu, setShowMobileMenu] = useState(false);
    const dropdownRef = useRef(null);
    const mobileMenuRef = useRef(null);

    useEffect(() => {
        if (!document.head.querySelector('style[data-navbar]')) {
            const styleSheet = document.createElement('style');
            styleSheet.setAttribute('data-navbar', 'true');
            styleSheet.textContent = `
                @keyframes pulse {
                    0%, 100% {
                        transform: scale(1);
                    }
                    50% {
                        transform: scale(1.1);
                    }
                }
                
                @keyframes shimmer {
                    0% {
                        background-position: -1000px 0;
                    }
                    100% {
                        background-position: 1000px 0;
                    }
                }
                
                @keyframes slideDown {
                    from {
                        opacity: 0;
                        transform: translateY(-20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                
                nav a:hover {
                    color: #FFD700 !important;
                    transform: translateY(-2px);
                }
                
                nav button:hover {
                    background-color: rgba(255, 215, 0, 0.3) !important;
                    transform: scale(1.05);
                }
                
                .logo-text {
                    background: linear-gradient(90deg, #FFD700 0%, #FFF 50%, #FFD700 100%);
                    background-size: 200% auto;
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    background-clip: text;
                    animation: shimmer 3s linear infinite;
                }
                
                .mobile-menu-open {
                    animation: slideDown 0.3s ease-out;
                }
                
                @media (max-width: 768px) {
                    nav a:hover {
                        transform: none;
                    }
                }

                @media print {
                    .no-print { display: none !important; }
                }
            `;
            document.head.appendChild(styleSheet);
        }
    }, []);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setShowDropdown(false);
            }
            if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target)) {
                const hamburger = document.querySelector('[data-hamburger]');
                if (hamburger && !hamburger.contains(event.target)) {
                    setShowMobileMenu(false);
                }
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLogout = () => {
        logout();
        setShowDropdown(false);
        setShowMobileMenu(false);
        navigate('/login');
    };

    const handleProfileClick = () => {
        setShowDropdown(false);
        setShowMobileMenu(false);
        navigate('/profile');
    };

    const handleLinkClick = () => {
        setShowMobileMenu(false);
    };

    return (
        <nav className="no-print" style={styles.nav}>
            <div style={styles.container}>
                <Link to="/" style={styles.logoLink}>
                    <span className="logo-text" style={styles.logo}>BIGURI</span>
                </Link>
                
                {/* Hamburger Menu Button */}
                <button 
                    style={styles.hamburger}
                    onClick={() => setShowMobileMenu(!showMobileMenu)}
                    data-hamburger
                    aria-label="Toggle menu"
                >
                    {showMobileMenu ? '✕' : '☰'}
                </button>
                
                {/* Desktop Menu */}
                <div style={styles.desktopLinks}>
                    <Link to="/products" style={styles.link}>
                        <span style={styles.linkIcon}>🍱</span>
                        สินค้า
                    </Link>
                    
                    <Link to="/promotion-banners" style={styles.link}>
                        <span style={styles.linkIcon}>🎉</span>
                        โปรโมชั่น
                    </Link>
                    
                    <Link to="/membership" style={styles.link}>
                        <span style={styles.linkIcon}>⭐</span>
                        สมาชิก VIP
                    </Link>
                    
                    <Link to="/contact" style={styles.link}>
                        <span style={styles.linkIcon}>📞</span>
                        ติดต่อเรา
                    </Link>
                    
                    <Link to="/cart" style={styles.cartLink}>
                        <span style={styles.linkIcon}>🛒</span>
                        <span>ตะกร้า</span>
                        {totalItems > 0 && (
                            <span style={styles.badge}>{totalItems}</span>
                        )}
                    </Link>
                    
                    {user ? (
                        <>
                            <Link to="/orders" style={styles.link}>
                                <span style={styles.linkIcon}>📦</span>
                                คำสั่งซื้อ
                            </Link>
                            
                            <div style={styles.userSection} ref={dropdownRef}>
                                <button 
                                    style={styles.userButton}
                                    onClick={() => setShowDropdown(!showDropdown)}
                                >
                                    <span style={styles.linkIcon}>👤</span>
                                    {user.email.split('@')[0]} ▼
                                </button>
                                
                                {showDropdown && (
                                    <div style={styles.dropdown}>
                                        <button 
                                            style={styles.dropdownItem}
                                            onClick={handleProfileClick}
                                            onMouseEnter={(e) => e.target.style.backgroundColor = '#f0f8ff'}
                                            onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                                        >
                                            <span style={styles.dropdownIcon}>👤</span>
                                            ข้อมูลส่วนตัว
                                        </button>
                                        <button 
                                            style={styles.dropdownItem}
                                            onClick={handleLogout}
                                            onMouseEnter={(e) => e.target.style.backgroundColor = '#fff0f0'}
                                            onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                                        >
                                            <span style={styles.dropdownIcon}>🚪</span>
                                            ออกจากระบบ
                                        </button>
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <>
                            <Link to="/login" style={styles.link}>
                                <span style={styles.linkIcon}>🔑</span>
                                เข้าสู่ระบบ
                            </Link>
                            <Link to="/register" style={styles.loginButton}>
                                <span style={styles.linkIcon}>✨</span>
                                สมัครสมาชิก
                            </Link>
                        </>
                    )}
                </div>

                {/* Mobile Menu */}
                {showMobileMenu && (
                    <div style={styles.mobileMenu} className="mobile-menu-open" ref={mobileMenuRef}>
                        <Link to="/products" style={styles.mobileLink} onClick={handleLinkClick}>
                            <span style={styles.linkIcon}>🍱</span>
                            สินค้า
                        </Link>
                        
                        <Link to="/promotion-banners" style={styles.mobileLink} onClick={handleLinkClick}>
                            <span style={styles.linkIcon}>🎉</span>
                            โปรโมชั่น
                        </Link>
                        
                        <Link to="/membership" style={styles.mobileLink} onClick={handleLinkClick}>
                            <span style={styles.linkIcon}>⭐</span>
                            สมาชิก VIP
                        </Link>
                        
                        <Link to="/contact" style={styles.mobileLink} onClick={handleLinkClick}>
                            <span style={styles.linkIcon}>📞</span>
                            ติดต่อเรา
                        </Link>
                        
                        <Link to="/cart" style={styles.mobileLink} onClick={handleLinkClick}>
                            <span style={styles.linkIcon}>🛒</span>
                            ตะกร้า
                            {totalItems > 0 && (
                                <span style={styles.mobileBadge}>{totalItems}</span>
                            )}
                        </Link>
                        
                        {user ? (
                            <>
                                <Link to="/orders" style={styles.mobileLink} onClick={handleLinkClick}>
                                    <span style={styles.linkIcon}>📦</span>
                                    คำสั่งซื้อ
                                </Link>
                                
                                <div style={styles.mobileDivider}></div>
                                
                                <div style={styles.mobileUserInfo}>
                                    <span style={styles.linkIcon}>👤</span>
                                    {user.email}
                                </div>
                                
                                <Link to="/profile" style={styles.mobileLink} onClick={handleLinkClick}>
                                    <span style={styles.linkIcon}>👤</span>
                                    ข้อมูลส่วนตัว
                                </Link>
                                
                                <button style={styles.mobileLogoutButton} onClick={handleLogout}>
                                    <span style={styles.linkIcon}>🚪</span>
                                    ออกจากระบบ
                                </button>
                            </>
                        ) : (
                            <>
                                <div style={styles.mobileDivider}></div>
                                <Link to="/login" style={styles.mobileLink} onClick={handleLinkClick}>
                                    <span style={styles.linkIcon}>🔑</span>
                                    เข้าสู่ระบบ
                                </Link>
                                <Link to="/register" style={styles.mobileRegisterButton} onClick={handleLinkClick}>
                                    <span style={styles.linkIcon}>✨</span>
                                    สมัครสมาชิก
                                </Link>
                            </>
                        )}
                    </div>
                )}
            </div>
        </nav>
    );
};

const styles = {
    nav: {
        background: 'linear-gradient(135deg, #001a33 0%, #003d5c 50%, #00273f 100%)',
        padding: '1rem 0',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3), 0 0 20px rgba(0, 100, 150, 0.2)',
        position: 'sticky',
        top: 0,
        zIndex: 1000,
        borderBottom: '2px solid rgba(255, 215, 0, 0.3)',
    },
    container: {
        maxWidth: '1400px',
        margin: '0 auto',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '0 1rem',
        position: 'relative',
    },
    logoLink: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        textDecoration: 'none',
        transition: 'transform 0.3s',
        zIndex: 1001,
    },
    logo: {
        fontSize: 'clamp(1.5rem, 5vw, 2.5rem)',
        fontWeight: 'bold',
        letterSpacing: '0.15rem',
        fontFamily: 'serif',
    },
    hamburger: {
        display: 'none',
        backgroundColor: 'transparent',
        border: '2px solid rgba(255, 215, 0, 0.4)',
        color: 'white',
        fontSize: '1.5rem',
        cursor: 'pointer',
        padding: '0.5rem 0.8rem',
        borderRadius: '8px',
        transition: 'all 0.3s ease',
        zIndex: 1001,
    },
    desktopLinks: {
        display: 'flex',
        gap: '1.8rem',
        alignItems: 'center',
    },
    link: {
        color: 'white',
        textDecoration: 'none',
        fontSize: '1rem',
        fontWeight: '500',
        transition: 'all 0.3s ease',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '0.4rem',
        padding: '0.5rem 0.8rem',
        borderRadius: '8px',
        whiteSpace: 'nowrap',
    },
    linkIcon: {
        fontSize: '1.2rem',
    },
    cartLink: {
        position: 'relative',
        color: 'white',
        textDecoration: 'none',
        fontSize: '1rem',
        fontWeight: '500',
        display: 'flex',
        alignItems: 'center',
        gap: '0.4rem',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        padding: '0.5rem 0.8rem',
        borderRadius: '8px',
        whiteSpace: 'nowrap',
    },
    badge: {
        position: 'absolute',
        top: '-5px',
        right: '-5px',
        backgroundColor: '#FFD700',
        color: '#001a33',
        borderRadius: '50%',
        width: '22px',
        height: '22px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '0.75rem',
        fontWeight: 'bold',
        border: '2px solid white',
        boxShadow: '0 2px 6px rgba(255, 215, 0, 0.5)',
        animation: 'pulse 1.5s infinite',
    },
    loginButton: {
        backgroundColor: '#FFD700',
        color: '#001a33',
        textDecoration: 'none',
        fontSize: '1.05rem',
        fontWeight: 'bold',
        padding: '0.6rem 1.5rem',
        borderRadius: '25px',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        display: 'flex',
        alignItems: 'center',
        gap: '0.4rem',
        border: '2px solid #FFD700',
        boxShadow: '0 4px 10px rgba(255, 215, 0, 0.3)',
    },
    userSection: {
        position: 'relative',
    },
    userButton: {
        backgroundColor: 'rgba(255, 215, 0, 0.15)',
        color: 'white',
        border: '2px solid rgba(255, 215, 0, 0.4)',
        cursor: 'pointer',
        fontSize: '0.95rem',
        fontWeight: '500',
        padding: '0.6rem 1.2rem',
        borderRadius: '25px',
        transition: 'all 0.3s ease',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        boxShadow: '0 2px 6px rgba(0, 0, 0, 0.2)',
    },
    dropdown: {
        position: 'absolute',
        top: '100%',
        right: 0,
        marginTop: '0.8rem',
        backgroundColor: 'white',
        borderRadius: '12px',
        boxShadow: '0 8px 20px rgba(0, 0, 0, 0.3)',
        minWidth: '220px',
        overflow: 'hidden',
        zIndex: 1000,
        border: '2px solid rgba(0, 26, 51, 0.1)',
    },
    dropdownItem: {
        width: '100%',
        padding: '1rem 1.2rem',
        backgroundColor: 'transparent',
        border: 'none',
        textAlign: 'left',
        cursor: 'pointer',
        fontSize: '1rem',
        fontWeight: '500',
        color: '#001a33',
        transition: 'all 0.2s ease',
        display: 'flex',
        alignItems: 'center',
        gap: '0.8rem',
    },
    dropdownIcon: {
        fontSize: '1.2rem',
    },
    mobileMenu: {
        display: 'none',
        position: 'absolute',
        top: '100%',
        left: 0,
        right: 0,
        backgroundColor: '#001a33',
        borderTop: '2px solid rgba(255, 215, 0, 0.3)',
        boxShadow: '0 8px 20px rgba(0, 0, 0, 0.4)',
        maxHeight: '80vh',
        overflowY: 'auto',
        paddingBottom: '1rem',
    },
    mobileLink: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.8rem',
        padding: '1rem 1.5rem',
        color: 'white',
        textDecoration: 'none',
        fontSize: '1.1rem',
        fontWeight: '500',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        transition: 'all 0.2s ease',
        position: 'relative',
    },
    mobileBadge: {
        marginLeft: 'auto',
        backgroundColor: '#FFD700',
        color: '#001a33',
        borderRadius: '50%',
        width: '24px',
        height: '24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '0.8rem',
        fontWeight: 'bold',
    },
    mobileDivider: {
        height: '1px',
        backgroundColor: 'rgba(255, 215, 0, 0.3)',
        margin: '0.5rem 0',
    },
    mobileUserInfo: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.8rem',
        padding: '1rem 1.5rem',
        color: '#FFD700',
        fontSize: '0.95rem',
        fontWeight: '600',
    },
    mobileLogoutButton: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.8rem',
        padding: '1rem 1.5rem',
        width: '100%',
        backgroundColor: 'transparent',
        border: 'none',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        color: '#ff6b6b',
        fontSize: '1.1rem',
        fontWeight: '500',
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'all 0.2s ease',
    },
    mobileRegisterButton: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.8rem',
        padding: '1rem 1.5rem',
        margin: '1rem 1.5rem',
        backgroundColor: '#FFD700',
        color: '#001a33',
        textDecoration: 'none',
        fontSize: '1.1rem',
        fontWeight: 'bold',
        borderRadius: '25px',
        border: '2px solid #FFD700',
        boxShadow: '0 4px 10px rgba(255, 215, 0, 0.3)',
    },
};

// Media query styles using window.matchMedia
if (typeof window !== 'undefined') {
    const mediaQuery = window.matchMedia('(max-width: 768px)');
    
    const applyMobileStyles = (e) => {
        if (e.matches) {
            styles.hamburger.display = 'block';
            styles.desktopLinks.display = 'none';
            styles.mobileMenu.display = 'block';
        } else {
            styles.hamburger.display = 'none';
            styles.desktopLinks.display = 'flex';
            styles.mobileMenu.display = 'none';
        }
    };
    
    mediaQuery.addListener(applyMobileStyles);
    applyMobileStyles(mediaQuery);
}

export default Navbar;