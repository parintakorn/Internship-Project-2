import React, { useState, useEffect } from 'react';

const API_BASE = `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api`;

const PromotionPage = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchBanners();
  }, []);

  const fetchBanners = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${API_BASE}/banners`);

      if (!response.ok) {
        throw new Error('ไม่สามารถดึงข้อมูลแบนเนอร์ได้');
      }

      const data = await response.json();
      setBanners(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching banners:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Auto slide every 4 seconds
  useEffect(() => {
    if (banners.length > 0) {
      const interval = setInterval(() => {
        setCurrentSlide((prev) => (prev + 1) % banners.length);
      }, 4000);

      return () => clearInterval(interval);
    }
  }, [banners.length]);

  const goToSlide = (index) => {
    setCurrentSlide(index);
  };

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % banners.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + banners.length) % banners.length);
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingSpinner}>⏳</div>
        <div style={styles.loadingText}>กำลังโหลดโปรโมชั่น...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.errorContainer}>
        <div style={styles.errorIcon}>⚠️</div>
        <div style={styles.errorText}>เกิดข้อผิดพลาด: {error}</div>
        <button style={styles.retryButton} onClick={fetchBanners}>
          ลองอีกครั้ง
        </button>
      </div>
    );
  }

  if (banners.length === 0) {
    return (
      <div style={styles.emptyContainer}>
        <div style={styles.emptyIcon}>🎉</div>
        <div style={styles.emptyText}>ยังไม่มีโปรโมชั่น</div>
        <div style={styles.emptySubtext}>กรุณารอสักครู่ เรากำลังเตรียมโปรโมชั่นพิเศษสำหรับคุณ!</div>
      </div>
    );
  }

  return (
    <div style={styles.pageContainer}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.headerTitle}>🎉 โปรโมชั่นพิเศษ</h1>
        <div style={styles.counter}>
          {currentSlide + 1} / {banners.length}
        </div>
      </div>

      {/* Main Slideshow */}
      <div style={styles.slideshowContainer}>
        {/* Navigation Arrows */}
        {banners.length > 1 && (
          <>
            <button style={styles.navButton} onClick={prevSlide} aria-label="Previous slide">
              ‹
            </button>
            <button style={{ ...styles.navButton, right: '20px', left: 'auto' }} onClick={nextSlide} aria-label="Next slide">
              ›
            </button>
          </>
        )}

        {/* Slides */}
        <div style={styles.slidesWrapper}>
          {banners.map((banner, index) => (
            <div
              key={banner.banner_id || index}
              style={{
                ...styles.slide,
                opacity: index === currentSlide ? 1 : 0,
                transform: index === currentSlide ? 'scale(1)' : 'scale(0.95)',
                zIndex: index === currentSlide ? 2 : 1,
              }}
            >
              <div style={styles.bannerImageContainer}>
                <img
                  src={banner.image_url}
                  alt={`Promotion Banner ${index + 1}`}
                  style={styles.bannerImage}
                  onError={(e) => {
                    e.target.src = 'https://placehold.co/1200x500/ee4d2d/white?text=Promotion+Banner';
                  }}
                />
                
                {/* Decorative Overlay */}
                <div style={styles.imageOverlay} />
              </div>
            </div>
          ))}
        </div>

        {/* Dots Navigation */}
        {banners.length > 1 && (
          <div style={styles.dotsContainer}>
            {banners.map((_, index) => (
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
      {banners.length > 1 && (
        <div style={styles.thumbnailStrip}>
          {banners.map((banner, index) => (
            <div
              key={banner.banner_id || index}
              onClick={() => goToSlide(index)}
              style={{
                ...styles.thumbnail,
                ...(index === currentSlide ? styles.thumbnailActive : {})
              }}
            >
              <img
                src={banner.image_url}
                alt={`Thumbnail ${index + 1}`}
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
  pageContainer: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    display: 'flex',
    flexDirection: 'column',
    padding: '2rem',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '2rem',
    padding: '1.5rem 2rem',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    backdropFilter: 'blur(10px)',
    borderRadius: '16px',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
  },
  headerTitle: {
    fontSize: 'clamp(1.5rem, 4vw, 2.5rem)',
    fontWeight: 'bold',
    color: 'white',
    margin: 0,
    textShadow: '0 2px 10px rgba(0, 0, 0, 0.2)',
  },
  counter: {
    padding: '0.5rem 1.5rem',
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    color: 'white',
    borderRadius: '20px',
    fontSize: '1rem',
    fontWeight: 'bold',
    backdropFilter: 'blur(10px)',
  },
  slideshowContainer: {
    flex: 1,
    position: 'relative',
    maxWidth: '1400px',
    width: '100%',
    margin: '0 auto',
    borderRadius: '24px',
    overflow: 'hidden',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
    backgroundColor: '#000',
  },
  slidesWrapper: {
    position: 'relative',
    width: '100%',
    height: '100%',
    minHeight: '500px',
  },
  slide: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    transition: 'all 0.6s ease-in-out',
  },
  bannerImageContainer: {
    position: 'relative',
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
    objectPosition: 'center',
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '30%',
    background: 'linear-gradient(to top, rgba(0,0,0,0.5), transparent)',
    pointerEvents: 'none',
  },
  navButton: {
    position: 'absolute',
    top: '50%',
    left: '20px',
    transform: 'translateY(-50%)',
    zIndex: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    color: 'white',
    border: 'none',
    borderRadius: '50%',
    width: '60px',
    height: '60px',
    fontSize: '3rem',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    backdropFilter: 'blur(10px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotsContainer: {
    position: 'absolute',
    bottom: '20px',
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    gap: '12px',
    zIndex: 10,
    padding: '1rem',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: '50px',
    backdropFilter: 'blur(10px)',
  },
  dot: {
    width: '14px',
    height: '14px',
    borderRadius: '50%',
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    padding: 0,
  },
  dotActive: {
    width: '40px',
    borderRadius: '7px',
    backgroundColor: 'white',
  },
  thumbnailStrip: {
    display: 'flex',
    gap: '1rem',
    marginTop: '2rem',
    padding: '1rem',
    overflowX: 'auto',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: '16px',
    backdropFilter: 'blur(10px)',
  },
  thumbnail: {
    minWidth: '180px',
    height: '100px',
    borderRadius: '12px',
    overflow: 'hidden',
    cursor: 'pointer',
    position: 'relative',
    transition: 'all 0.3s ease',
    border: '3px solid transparent',
  },
  thumbnailActive: {
    border: '3px solid white',
    transform: 'scale(1.05)',
    boxShadow: '0 8px 25px rgba(0, 0, 0, 0.3)',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  thumbnailActiveBorder: {
    position: 'absolute',
    inset: 0,
    border: '3px solid white',
    borderRadius: '9px',
    pointerEvents: 'none',
  },
  loadingContainer: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '1.5rem',
  },
  loadingSpinner: {
    fontSize: '4rem',
  },
  loadingText: {
    color: 'white',
    fontSize: 'clamp(1.2rem, 3vw, 1.8rem)',
    fontWeight: '600',
  },
  errorContainer: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '1.5rem',
    padding: '2rem',
  },
  errorIcon: {
    fontSize: '5rem',
  },
  errorText: {
    color: 'white',
    fontSize: 'clamp(1.2rem, 3vw, 1.5rem)',
    textAlign: 'center',
    maxWidth: '600px',
  },
  retryButton: {
    padding: '1rem 2.5rem',
    backgroundColor: 'white',
    color: '#667eea',
    border: 'none',
    borderRadius: '12px',
    fontSize: '1.1rem',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
  },
  emptyContainer: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '1.5rem',
    padding: '2rem',
  },
  emptyIcon: {
    fontSize: '6rem',
  },
  emptyText: {
    color: 'white',
    fontSize: 'clamp(1.5rem, 4vw, 2.5rem)',
    fontWeight: 'bold',
  },
  emptySubtext: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 'clamp(1rem, 2vw, 1.3rem)',
    textAlign: 'center',
    maxWidth: '600px',
    lineHeight: '1.6',
  },
};

// Add hover effects
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  `;
  
  if (!document.head.querySelector('style[data-promotion-page]')) {
    style.setAttribute('data-promotion-page', 'true');
    document.head.appendChild(style);
  }
}

export default PromotionPage;