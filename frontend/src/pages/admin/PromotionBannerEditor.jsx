import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';

const API_BASE = `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api`;

const PromotionBannerEditor = () => {
  const { token, user } = useContext(AuthContext);
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchBanners();
  }, []);

  const fetchBanners = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${API_BASE}/banners`, {
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'ไม่สามารถดึงข้อมูลแบนเนอร์ได้');
      }

      const data = await response.json();
      console.log('✅ Banners fetched:', data);
      setBanners(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('❌ Error fetching banners:', err);
      setError(err.message);
      setBanners([]);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!token) {
      alert('กรุณาล็อกอินก่อนอัพโหลดรูป');
      return;
    }

    if (user?.role !== 'admin') {
      alert('คุณไม่มีสิทธิ์เข้าถึง (ต้องเป็น Admin)');
      return;
    }

    try {
      setUploading(true);

      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch(`${API_BASE}/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Upload failed');
      }

      const data = await response.json();
      const imageUrl = data.imageUrl || data.url || data.path;

      console.log('✅ Image uploaded:', imageUrl);

      // เพิ่มแบนเนอร์ใหม่
      await addBanner(imageUrl);
      
      alert('อัพโหลดรูปสำเร็จ!');
      e.target.value = '';
    } catch (error) {
      console.error('❌ Upload error:', error);
      alert('อัพโหลดรูปไม่สำเร็จ: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleUrlAdd = async () => {
    const url = prompt('ใส่ URL รูปภาพ:');
    if (!url || !url.trim()) return;

    if (!token) {
      alert('กรุณาล็อกอินก่อนเพิ่มแบนเนอร์');
      return;
    }

    if (user?.role !== 'admin') {
      alert('คุณไม่มีสิทธิ์เข้าถึง (ต้องเป็น Admin)');
      return;
    }

    try {
      await addBanner(url.trim());
      alert('เพิ่มแบนเนอร์สำเร็จ!');
    } catch (error) {
      console.error('❌ Add banner error:', error);
      alert('เพิ่มแบนเนอร์ไม่สำเร็จ: ' + error.message);
    }
  };

  const addBanner = async (imageUrl) => {
    const response = await fetch(`${API_BASE}/banners`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ 
        image_url: imageUrl,
        title: 'แบนเนอร์โปรโมชั่น',
        is_active: true
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'เพิ่มแบนเนอร์ไม่สำเร็จ');
    }

    const data = await response.json();
    console.log('✅ Banner added:', data);
    
    await fetchBanners();
  };

  const handleDelete = async (bannerId) => {
    if (!window.confirm('ต้องการลบแบนเนอร์นี้หรือไม่?')) return;

    if (!token) {
      alert('กรุณาล็อกอินก่อนทำรายการ');
      return;
    }

    if (user?.role !== 'admin') {
      alert('คุณไม่มีสิทธิ์เข้าถึง (ต้องเป็น Admin)');
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/banners/${bannerId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'ลบไม่สำเร็จ');
      }

      console.log('✅ Banner deleted');
      alert('ลบแบนเนอร์สำเร็จ!');
      fetchBanners();
    } catch (error) {
      console.error('❌ Delete error:', error);
      alert('ลบแบนเนอร์ไม่สำเร็จ: ' + error.message);
    }
  };

  const handleToggleActive = async (bannerId, currentStatus) => {
    if (!token) {
      alert('กรุณาล็อกอินก่อนทำรายการ');
      return;
    }

    if (user?.role !== 'admin') {
      alert('คุณไม่มีสิทธิ์เข้าถึง (ต้องเป็น Admin)');
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/banners/${bannerId}/toggle`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ is_active: !currentStatus })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'เปลี่ยนสถานะไม่สำเร็จ');
      }

      console.log('✅ Banner toggled');
      fetchBanners();
    } catch (error) {
      console.error('❌ Toggle error:', error);
      alert('เปลี่ยนสถานะไม่สำเร็จ: ' + error.message);
    }
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
        <button style={styles.retryButton} onClick={fetchBanners}>
          ลองอีกครั้ง
        </button>
      </div>
    );
  }

  return (
    <div style={styles.pageContainer}>
      {/* Header */}
      <div style={styles.header}>
        <button style={styles.backButton} onClick={() => window.history.back()}>
          ← กลับ
        </button>
        <h1 style={styles.headerTitle}>🖼️ จัดการแบนเนอร์โปรโมชั่น</h1>
        <div style={styles.counter}>
          {banners.length} แบนเนอร์
        </div>
      </div>

      {/* Upload Section */}
      <div style={styles.uploadSection}>
        <div style={styles.uploadCard}>
          <h2 style={styles.uploadTitle}>➕ เพิ่มแบนเนอร์ใหม่</h2>
          
          <div style={styles.uploadButtons}>
            <label style={styles.uploadButton}>
              📁 อัพโหลดไฟล์
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                disabled={uploading}
                style={styles.fileInput}
              />
            </label>
            
            <button onClick={handleUrlAdd} style={styles.urlButton} disabled={uploading}>
              🔗 ใส่ URL รูปภาพ
            </button>
          </div>
          
          {uploading && (
            <div style={styles.uploadingText}>
              ⏳ กำลังอัพโหลด...
            </div>
          )}
        </div>
      </div>

      {/* Banners Grid */}
      {banners.length === 0 ? (
        <div style={styles.emptyContainer}>
          <div style={styles.emptyIcon}>📭</div>
          <div style={styles.emptyText}>ยังไม่มีแบนเนอร์</div>
          <div style={styles.emptySubtext}>เพิ่มแบนเนอร์แรกของคุณเลย!</div>
        </div>
      ) : (
        <div style={styles.grid}>
          {banners.map((banner, index) => (
            <div key={banner.id || index} style={styles.card}>
              <div style={styles.imageSection}>
                <img
                  src={banner.image_url}
                  alt={banner.title || `Banner ${index + 1}`}
                  style={styles.bannerImage}
                  onError={(e) => {
                    e.target.src = 'https://placehold.co/800x400/eee/999?text=Error+Loading+Image';
                  }}
                />
                <div style={styles.imageOverlay}>
                  <div style={styles.overlayButtons}>
                    <button
                      onClick={() => handleToggleActive(banner.id, banner.is_active)}
                      style={{
                        ...styles.toggleButton,
                        backgroundColor: banner.is_active ? '#ff9800' : '#4CAF50'
                      }}
                    >
                      {banner.is_active ? '👁️ ซ่อน' : '👁️ แสดง'}
                    </button>
                    <button
                      onClick={() => handleDelete(banner.id)}
                      style={styles.deleteButton}
                    >
                      🗑️ ลบ
                    </button>
                  </div>
                </div>
              </div>
              
              <div style={styles.cardInfo}>
                <div style={styles.bannerTitle}>
                  <span style={styles.bannerNumber}>
                    {banner.title || `แบนเนอร์ #${index + 1}`}
                  </span>
                  <span style={{
                    ...styles.statusBadge,
                    backgroundColor: banner.is_active ? '#4CAF50' : '#999'
                  }}>
                    {banner.is_active ? '🟢 เปิด' : '⚫ ปิด'}
                  </span>
                </div>
                <span style={styles.bannerDate}>
                  {new Date(banner.created_at || Date.now()).toLocaleDateString('th-TH', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </span>
              </div>
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
    flexWrap: 'wrap',
    gap: '1rem',
  },
  headerTitle: {
    fontSize: 'clamp(1.5rem, 4vw, 2rem)',
    fontWeight: 'bold',
    color: 'white',
    margin: 0,
    textShadow: '0 2px 10px rgba(0, 0, 0, 0.2)',
  },
  backButton: {
    padding: '0.75rem 1.5rem',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    color: 'white',
    border: '2px solid rgba(255, 255, 255, 0.3)',
    borderRadius: '12px',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    backdropFilter: 'blur(10px)',
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
  uploadSection: {
    maxWidth: '1400px',
    margin: '0 auto 2rem',
  },
  uploadCard: {
    backgroundColor: 'white',
    borderRadius: '16px',
    padding: '2rem',
    boxShadow: '0 8px 25px rgba(0, 0, 0, 0.15)',
  },
  uploadTitle: {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: '1.5rem',
    textAlign: 'center',
  },
  uploadButtons: {
    display: 'flex',
    gap: '1rem',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  uploadButton: {
    position: 'relative',
    padding: '1rem 2rem',
    backgroundColor: '#4CAF50',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    fontSize: '1.1rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    display: 'inline-block',
  },
  urlButton: {
    padding: '1rem 2rem',
    backgroundColor: '#2196F3',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    fontSize: '1.1rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
  },
  fileInput: {
    position: 'absolute',
    opacity: 0,
    width: '100%',
    height: '100%',
    top: 0,
    left: 0,
    cursor: 'pointer',
  },
  uploadingText: {
    textAlign: 'center',
    marginTop: '1rem',
    color: '#2196F3',
    fontSize: '1.1rem',
    fontWeight: '600',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
    gap: '1.5rem',
    maxWidth: '1400px',
    margin: '0 auto',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: '16px',
    overflow: 'hidden',
    boxShadow: '0 8px 25px rgba(0, 0, 0, 0.15)',
    transition: 'transform 0.3s ease, box-shadow 0.3s ease',
  },
  imageSection: {
    position: 'relative',
    width: '100%',
    height: '250px',
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  imageOverlay: {
    position: 'absolute',
    inset: 0,
    background: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0,
    transition: 'opacity 0.3s ease',
  },
  overlayButtons: {
    display: 'flex',
    gap: '1rem',
    flexDirection: 'column',
  },
  toggleButton: {
    padding: '0.75rem 1.5rem',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
  },
  deleteButton: {
    padding: '0.75rem 1.5rem',
    backgroundColor: '#f44336',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
  },
  cardInfo: {
    padding: '1rem 1.5rem',
    backgroundColor: '#f8f9fa',
  },
  bannerTitle: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '0.5rem',
  },
  bannerNumber: {
    fontSize: '1rem',
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  statusBadge: {
    padding: '0.25rem 0.75rem',
    borderRadius: '12px',
    fontSize: '0.85rem',
    fontWeight: 'bold',
    color: 'white',
  },
  bannerDate: {
    fontSize: '0.9rem',
    color: '#666',
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
    animation: 'spin 2s linear infinite',
  },
  loadingText: {
    color: 'white',
    fontSize: '1.5rem',
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
    fontSize: '1.3rem',
    textAlign: 'center',
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
  },
  emptyContainer: {
    textAlign: 'center',
    padding: '4rem 2rem',
    color: 'white',
  },
  emptyIcon: {
    fontSize: '5rem',
    marginBottom: '1rem',
  },
  emptyText: {
    fontSize: '2rem',
    fontWeight: 'bold',
    marginBottom: '0.5rem',
  },
  emptySubtext: {
    fontSize: '1.1rem',
    opacity: 0.8,
  },
};

// Add hover effects
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    
    .card:hover {
      transform: translateY(-5px);
      box-shadow: 0 12px 35px rgba(0, 0, 0, 0.2) !important;
    }
    
    .imageSection:hover .imageOverlay {
      opacity: 1 !important;
    }
    
    .uploadButton:hover:not(:disabled) {
      background-color: #45a049;
      transform: scale(1.05);
    }
    
    .urlButton:hover:not(:disabled) {
      background-color: #0b7dda;
      transform: scale(1.05);
    }
    
    .deleteButton:hover {
      background-color: #da190b;
      transform: scale(1.05);
    }
    
    .toggleButton:hover {
      opacity: 0.9;
      transform: scale(1.05);
    }
    
    .backButton:hover {
      background-color: rgba(255, 255, 255, 0.3);
      transform: scale(1.05);
    }
    
    .retryButton:hover {
      background-color: #f0f0f0;
      color: #5a5fc7;
    }
  `;
  document.head.appendChild(style);
}

export default PromotionBannerEditor;