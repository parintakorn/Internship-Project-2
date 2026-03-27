import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from "../context/AuthContext";

const API_BASE = `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api`;

const PromotionBanners = () => {
  const { token } = useContext(AuthContext);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [promotions, setPromotions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchPromotions();
  }, []);

  const fetchPromotions = async () => {
    try {
      setLoading(true);
      setError(null);

      // ⭐ เปลี่ยนจาก /promotions เป็น /banners
      const response = await fetch(`${API_BASE}/banners`, {
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('ไม่สามารถดึงข้อมูลแบนเนอร์ได้');
      }

      const data = await response.json();
      
      // ⭐ รองรับทั้ง format เก่าและใหม่
      const banners = Array.isArray(data) ? data : (data.banners || []);
      
      // กรองเฉพาะแบนเนอร์ที่มีรูปภาพและเปิดใช้งาน
      const activeBanners = banners.filter(banner => banner.image_url && banner.is_active);
      setPromotions(activeBanners);
    } catch (err) {
      console.error('Error fetching banners:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Auto slide every 4 seconds
  useEffect(() => {
    if (promotions.length > 0) {
      const interval = setInterval(() => {
        setCurrentSlide((prev) => (prev + 1) % promotions.length);
      }, 4000);

      return () => clearInterval(interval);
    }
  }, [promotions.length]);

  const goToSlide = (index) => {
    setCurrentSlide(index);
  };

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % promotions.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + promotions.length) % promotions.length);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'ไม่จำกัด';
    const date = new Date(dateString);
    return date.toLocaleDateString('th-TH', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingSpinner}>⏳</div>
        <div style={styles.loadingText}>กำลังโหลดแบนเนอร์...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.errorContainer}>
        <div style={styles.errorIcon}>⚠️</div>
        <div style={styles.errorText}>เกิดข้อผิดพลาด: {error}</div>
        <button style={styles.retryButton} onClick={fetchPromotions}>
          ลองอีกครั้ง
        </button>
      </div>
    );
  }

  if (promotions.length === 0) {
    return (
      <div style={styles.emptyContainer}>
        <div style={styles.emptyIcon}>📭</div>
        <div style={styles.emptyText}>ไม่มีแบนเนอร์โปรโมชั่น</div>
        <div style={styles.emptySubtext}>กรุณาอัพโหลดรูปภาพในหน้าจัดการแบนเนอร์</div>
        <button 
          style={styles.backButton}
          onClick={() => window.history.back()}
        >
          ← กลับ
        </button>
      </div>
    );
  }

  const currentPromo = promotions[currentSlide];

  return (
    <div style={styles.pageContainer}>
      {/* Header */}
      <div style={styles.header}>
        <button style={styles.backButton} onClick={() => window.history.back()}>
          ← กลับ
        </button>
        <h1 style={styles.headerTitle}>🎉 แบนเนอร์โปรโมชั่น</h1>
        <div style={styles.counter}>
          {currentSlide + 1} / {promotions.length}
        </div>
      </div>

      {/* Main Slideshow */}
      <div style={styles.slideshowContainer}>
        {/* Navigation Arrows */}
        {promotions.length > 1 && (
          <>
            <button style={styles.navButton} onClick={prevSlide}>
              ‹
            </button>
            <button style={{ ...styles.navButton, right: '20px', left: 'auto' }} onClick={nextSlide}>
              ›
            </button>
          </>
        )}

        {/* Slides */}
        <div style={styles.slidesWrapper}>
          {promotions.map((promo, index) => (
            <div
              key={promo.id || index}
              style={{
                ...styles.slide,
                opacity: index === currentSlide ? 1 : 0,
                transform: index === currentSlide ? 'scale(1)' : 'scale(0.95)',
                zIndex: index === currentSlide ? 2 : 1,
              }}
            >
              {/* Banner Image */}
              <div style={styles.bannerImageContainer}>
                <img
                  src={`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}${promo.image_url}`}
                  alt={promo.title || 'Banner'}
                  style={styles.bannerImage}
                  onError={(e) => {
                    e.target.src = 'https://placehold.co/1200x400/667eea/white?text=Banner';
                  }}
                />
                
                {/* Overlay Gradient */}
                <div style={styles.imageOverlay} />
              </div>

              {/* Info Section */}
              <div style={styles.infoSection}>
                <h2 style={styles.promoName}>{promo.title || 'แบนเนอร์โปรโมชั่น'}</h2>
                
                {promo.link_url && (
                  <a 
                    href={promo.link_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={styles.linkButton}
                  >
                    🔗 ดูรายละเอียด
                  </a>
                )}

                <div style={styles.dateRange}>
                  <span style={styles.dateItem}>
                    📅 {formatDate(promo.created_at)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Dots Navigation */}
        {promotions.length > 1 && (
          <div style={styles.dotsContainer}>
            {promotions.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                style={{
                  ...styles.dot,
                  ...(index === currentSlide ? styles.dotActive : {})
                }}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Thumbnail Strip */}
      {promotions.length > 1 && (
        <div style={styles.thumbnailStrip}>
          {promotions.map((promo, index) => (
            <div
              key={promo.id || index}
              onClick={() => goToSlide(index)}
              style={{
                ...styles.thumbnail,
                ...(index === currentSlide ? styles.thumbnailActive : {})
              }}
            >
              <img
                src={`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}${promo.image_url}`}
                alt={promo.title || 'Banner'}
                style={styles.thumbnailImage}
                onError={(e) => {
                  e.target.src = 'https://placehold.co/200x100/ccc/666?text=Banner';
                }}
              />
              {index === currentSlide && <div style={styles.thumbnailActiveBorder} />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const styles = {
  // ... (styles เหมือนเดิมทั้งหมด)
  linkButton: {
    display: 'inline-block',
    padding: '0.75rem 2rem',
    backgroundColor: '#667eea',
    color: 'white',
    borderRadius: '25px',
    fontSize: '1.1rem',
    fontWeight: '600',
    textDecoration: 'none',
    marginTop: '1rem',
    transition: 'all 0.3s ease',
    boxShadow: '0 4px 15px rgba(102, 126, 234, 0.3)',
  },
  // ... (รวม styles ที่เหลือทั้งหมด)
};

export default PromotionBanners;