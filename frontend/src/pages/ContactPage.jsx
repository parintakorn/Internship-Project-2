import { useState, useEffect } from 'react';

const ContactPage = () => {
    useEffect(() => {
        if (!document.head.querySelector('style[data-contact]')) {
            const styleSheet = document.createElement('style');
            styleSheet.setAttribute('data-contact', 'true');
            styleSheet.textContent = `
                @keyframes fadeInUp {
                    from {
                        opacity: 0;
                        transform: translateY(30px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                
                @keyframes pulse {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.05); }
                }
                
                .info-card:hover {
                    transform: translateY(-5px);
                    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.15);
                }
                
                .social-link:hover {
                    background-color: #003d5c;
                    color: white;
                    border-color: #003d5c;
                    transform: translateY(-2px);
                }
            `;
            document.head.appendChild(styleSheet);
        }
    }, []);

    return (
        <div style={styles.container}>
            {/* Hero Section */}
            <section style={styles.hero}>
                <div style={styles.heroOverlay}></div>
                <div style={styles.heroContent}>
                    <h1 style={styles.heroTitle}>ติดต่อเรา</h1>
                    <p style={styles.heroSubtitle}>
                        ยินดีให้บริการและตอบทุกคำถาม
                    </p>
                </div>
            </section>

            {/* Contact Info Cards */}
            <section style={styles.infoSection}>
                <div style={styles.infoGrid}>
                    <div className="info-card" style={styles.infoCard}>
                        <div style={styles.iconCircle}>
                            <span style={styles.iconEmoji}>📞</span>
                        </div>
                        <h3 style={styles.infoTitle}>โทรศัพท์</h3>
                        <a href="tel:0629532761" style={styles.infoLink}>
                            062-953-2761
                        </a>
                        <p style={styles.infoText}>จันทร์ - ศุกร์ 9:00 - 18:00</p>
                    </div>

                    <div className="info-card" style={styles.infoCard}>
    <div style={styles.iconCircle}>
        <img
            src="https://upload.wikimedia.org/wikipedia/commons/4/41/LINE_logo.svg"
            alt="Line Official"
            style={{
                width: "40px",
                height: "40px"
            }}
        />
    </div>
    <h3 style={styles.infoTitle}>Line Official</h3>
    <a
        href="https://line.me/ti/p/@biguri"
        style={styles.infoLink}
        target="_blank"
        rel="noopener noreferrer"
    >
        @biguri
    </a>
    <p style={styles.infoText}>ตอบกลับทันที 24/7</p>
</div>


                    <div className="info-card" style={styles.infoCard}>
    <div style={styles.iconCircle}>
        <img
            src="https://upload.wikimedia.org/wikipedia/commons/5/51/Facebook_f_logo_%282019%29.svg"
            alt="Facebook"
            style={{
                width: "28px",
                height: "28px"
            }}
        />
    </div>
    <h3 style={styles.infoTitle}>Facebook</h3>
    <a
        href="https://www.facebook.com/share/1NHPzvjpoP/?mibextid=wwXIfr"
        style={styles.infoLink}
        target="_blank"
        rel="noopener noreferrer"
    >
        Biguri วัตถุดิบอาหารญี่ปุ่นพรีเมี่ยม
    </a>
    <p style={styles.infoText}>ติดตามข่าวสารล่าสุด</p>
</div>


                </div>
            </section>

            {/* Location & Map Section */}
            <section style={styles.mainSection}>
                <div style={styles.contentGrid}>
                    {/* Location Info */}
                    <div style={styles.locationContainer}>
                        <h2 style={styles.sectionTitle}>ที่อยู่และเวลาทำการ</h2>
                        
                        <div style={styles.locationCard}>
                            <div style={styles.locationItem}>
                                <span style={styles.locationIcon}>📍</span>
                                <div>
                                    <h4 style={styles.locationTitle}>ที่อยู่</h4>
                                    <p style={styles.locationText}>
                                        52 ซอยเสือใหญ่อุทิศ (รัชดาภิเษก36แยก11)
            แขวงจันทรเกษม เขตจตุจักร
            กรุงเทพมหานคร 10900
                                    </p>
                                </div>
                            </div>

                            <div style={styles.locationItem}>
                                <span style={styles.locationIcon}>⏰</span>
                                <div>
                                    <h4 style={styles.locationTitle}>เวลาทำการ</h4>
                                    <p style={styles.locationText}>
                                        <strong>จันทร์ - ศุกร์:</strong> 9:00 - 18:00<br/>
                                        <strong>เสาร์ - อาทิตย์:</strong> 10:00 - 17:00<br/>
                                        <em style={{fontSize: '0.9rem', color: '#666'}}>
                                            (หยุดวันหยุดนักขัตฤกษ์)
                                        </em>
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Social Links */}
                        <div style={styles.socialSection}>
                            <h4 style={styles.socialTitle}>ติดตามเราได้ที่</h4>
                            <div style={styles.socialLinks}>
                                <a 
                                    href="https://www.facebook.com/share/1NHPzvjpoP/?mibextid=wwXIfr" 
                                    className="social-link"
                                    style={styles.socialLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    👍 Facebook
                                </a>
                                <a 
                                    href="https://line.me/ti/p/@biguri" 
                                    className="social-link"
                                    style={styles.socialLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    💬 Line
                                </a>
                            </div>
                        </div>
                    </div>

                   {/* Map */}
<div style={styles.mapWrapper}>
    <div style={styles.mapContainer}>
        <iframe
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3874.303216040286!2d100.57893067485729!3d13.820822486578297!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x30e29d006fd7b263%3A0xa4239549d52a053a!2sBiguri%20Omakase%20%26%20Buffet!5e0!3m2!1sth!2sth!4v1769578222966!5m2!1sth!2sth"
            width="100%"
            height="100%"
            style={{border: 0}}
            allowFullScreen=""
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title="Biguri Omakase & Buffet"
        />
    </div>
</div>
                </div>
            </section>
        </div>
    );
};

const styles = {
    container: {
        minHeight: '100vh',
        backgroundColor: '#f5f8fa',
    },
    hero: {
        position: 'relative',
        height: '300px',
        background: 'linear-gradient(135deg, #001a33 0%, #003d5c 50%, #00273f 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    heroOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'radial-gradient(circle at 50% 50%, rgba(255, 215, 0, 0.1) 0%, transparent 70%)',
    },
    heroContent: {
        position: 'relative',
        textAlign: 'center',
        color: 'white',
        zIndex: 1,
        animation: 'fadeInUp 0.8s ease-out',
    },
    heroTitle: {
        fontSize: '3.5rem',
        fontWeight: 'bold',
        marginBottom: '1rem',
        textShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
    },
    heroSubtitle: {
        fontSize: '1.3rem',
        opacity: 0.9,
    },
    infoSection: {
        padding: '4rem 2rem',
        maxWidth: '1400px',
        margin: '0 auto',
        marginTop: '-50px',
        position: 'relative',
        zIndex: 2,
    },
    infoGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '2rem',
    },
    infoCard: {
        backgroundColor: 'white',
        padding: '2.5rem 1.5rem',
        borderRadius: '16px',
        textAlign: 'center',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.1)',
        transition: 'all 0.3s ease',
        animation: 'fadeInUp 0.6s ease-out',
        cursor: 'pointer',
    },
    iconCircle: {
        width: '80px',
        height: '80px',
        borderRadius: '50%',
        background: 'linear-gradient(135deg, #001a33, #003d5c)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto 1.5rem',
        boxShadow: '0 4px 12px rgba(0, 26, 51, 0.3)',
    },
    iconEmoji: {
        fontSize: '2.5rem',
    },
    infoTitle: {
        fontSize: '1.3rem',
        fontWeight: 'bold',
        color: '#001a33',
        marginBottom: '0.8rem',
    },
    infoLink: {
        display: 'block',
        fontSize: '1.1rem',
        color: '#003d5c',
        textDecoration: 'none',
        fontWeight: '600',
        marginBottom: '0.5rem',
        transition: 'color 0.3s',
    },
    infoText: {
        color: '#666',
        fontSize: '0.95rem',
    },
    mainSection: {
        padding: '4rem 2rem',
        maxWidth: '1400px',
        margin: '0 auto',
    },
    contentGrid: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '3rem',
    },
    sectionTitle: {
        fontSize: '2rem',
        fontWeight: 'bold',
        color: '#001a33',
        marginBottom: '2rem',
    },
    locationContainer: {
        display: 'flex',
        flexDirection: 'column',
        gap: '2rem',
    },
    locationCard: {
        backgroundColor: 'white',
        padding: '2rem',
        borderRadius: '16px',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)',
        display: 'flex',
        flexDirection: 'column',
        gap: '2rem',
    },
    locationItem: {
        display: 'flex',
        gap: '1.5rem',
        alignItems: 'flex-start',
    },
    locationIcon: {
        fontSize: '2.5rem',
    },
    locationTitle: {
        fontSize: '1.2rem',
        fontWeight: 'bold',
        color: '#001a33',
        marginBottom: '0.5rem',
    },
    locationText: {
        color: '#555',
        lineHeight: '1.8',
        fontSize: '1rem',
    },
    socialSection: {
        backgroundColor: 'white',
        padding: '2rem',
        borderRadius: '16px',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)',
        textAlign: 'center',
    },
    socialTitle: {
        fontSize: '1.2rem',
        fontWeight: 'bold',
        color: '#001a33',
        marginBottom: '1.5rem',
    },
    socialLinks: {
        display: 'flex',
        gap: '1rem',
        justifyContent: 'center',
        flexWrap: 'wrap',
    },
    socialLink: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.8rem 1.5rem',
        backgroundColor: '#f0f8ff',
        color: '#003d5c',
        textDecoration: 'none',
        borderRadius: '8px',
        fontWeight: '600',
        transition: 'all 0.3s',
        border: '2px solid transparent',
    },
    mapWrapper: {
        display: 'flex',
        alignItems: 'stretch',
    },
    mapContainer: {
        flex: 1,
        borderRadius: '16px',
        overflow: 'hidden',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)',
        minHeight: '500px',
    },
    map: {
        border: 'none',
        display: 'block',
    },
};

export default ContactPage;