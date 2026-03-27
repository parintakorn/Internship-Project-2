import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';

// ✅ ใช้ /api/admin เพราะ routes อยู่ที่นั่น
const API_BASE = `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/admin`;

const Promotions = () => {
  const { token } = useContext(AuthContext);

  const [promotions, setPromotions] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentPromo, setCurrentPromo] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    discount_type: 'percent',
    discount_value: '',
    start_date: '',
    end_date: '',
    product_id: '',
    description: ''
  });

  const [imageData, setImageData] = useState({
    promotion_id: null,
    image_url: '',
    preview: ''
  });

  useEffect(() => {
    if (!token) {
      setError('กรุณาล็อกอินก่อนใช้งาน');
      setLoading(false);
      return;
    }
    fetchPromotions();
    fetchProducts();
  }, [token]);

  const fetchPromotions = async () => {
    try {
      setError(null);
      const response = await fetch(`${API_BASE}/promotions`, {
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
      });

      if (!response.ok) throw new Error(`โหลดโปรโมชั่นไม่สำเร็จ: ${response.status}`);

      const data = await response.json();
      console.log('📦 Promotions data:', data);
      // ✅ รองรับทั้ง array และ {promotions: [...]}
      setPromotions(Array.isArray(data) ? data : (data.promotions || []));
    } catch (error) {
      console.error('Error fetching promotions:', error);
      setError(error.message);
      setPromotions([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await fetch(`${API_BASE}/products`, {
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
      });

      if (!response.ok) { console.warn('โหลดสินค้าไม่สำเร็จ'); return; }

      const data = await response.json();
      console.log('📦 Products data:', data);
      // ✅ รองรับทั้ง array และ {products: [...]} ที่ getProducts ส่งมา
      setProducts(Array.isArray(data) ? data : (data.products || []));
    } catch (error) {
      console.error('Error fetching products:', error);
      setProducts([]);
    }
  };

  const getProductName = (productId) => {
    if (!productId) return 'ไม่ระบุสินค้า';
    const product = products.find(p => p.product_id === productId || p.product_id === Number(productId));
    return product?.name || `สินค้า ID: ${productId}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token) { alert('กรุณาล็อกอินก่อนทำรายการ'); return; }

    const url = editMode
      ? `${API_BASE}/promotions/${currentPromo.promotion_id}`
      : `${API_BASE}/promotions`;
    const method = editMode ? 'PUT' : 'POST';

    try {
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message || 'เกิดข้อผิดพลาด');
      }

      alert(editMode ? 'แก้ไขโปรโมชั่นสำเร็จ' : 'เพิ่มโปรโมชั่นสำเร็จ');
      fetchPromotions();
      closeModal();
    } catch (error) {
      console.error('Error:', error);
      alert(error.message);
    }
  };

  const handleEdit = (promo) => {
    setEditMode(true);
    setCurrentPromo(promo);
    setFormData({
      name: promo.name || '',
      discount_type: promo.discount_type || 'percent',
      discount_value: promo.discount_value || promo.discount_percentage || '',
      start_date: promo.start_date ? promo.start_date.split('T')[0] : '',
      end_date: promo.end_date ? promo.end_date.split('T')[0] : '',
      product_id: promo.product_id || '',
      description: promo.description || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('ต้องการลบโปรโมชั่นนี้?')) return;
    if (!token) { alert('กรุณาล็อกอินก่อนทำรายการ'); return; }

    try {
      const response = await fetch(`${API_BASE}/promotions/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('ลบไม่สำเร็จ');
      alert('ลบโปรโมชั่นสำเร็จ');
      fetchPromotions();
    } catch (error) {
      console.error('Error:', error);
      alert('ลบโปรโมชั่นไม่สำเร็จ');
    }
  };

  const openAddModal = () => {
    setEditMode(false);
    setCurrentPromo(null);
    setFormData({ name: '', discount_type: 'percent', discount_value: '', start_date: '', end_date: '', product_id: '', description: '' });
    setShowModal(true);
  };

  const closeModal = () => { setShowModal(false); setEditMode(false); setCurrentPromo(null); };

  const openImageModal = (promo) => {
    setImageData({ promotion_id: promo.promotion_id, image_url: promo.image_url || '', preview: promo.image_url || '' });
    setCurrentPromo(promo);
    setShowImageModal(true);
  };

  const closeImageModal = () => {
    setShowImageModal(false);
    setImageData({ promotion_id: null, image_url: '', preview: '' });
    setCurrentPromo(null);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !token) return;

    try {
      setUploading(true);
      const uploadData = new FormData();
      uploadData.append('image', file);

      // ✅ upload ไปที่ /api/admin/upload หรือ /api/upload ขึ้นอยู่กับ backend
      const uploadUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/upload`;
      const response = await fetch(uploadUrl, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: uploadData
      });

      if (!response.ok) throw new Error('Upload failed');

      const data = await response.json();
      const imageUrl = data.imageUrl || data.url || data.path;

      setImageData(prev => ({ ...prev, image_url: imageUrl, preview: imageUrl }));
      alert('อัพโหลดรูปสำเร็จ!');
    } catch (error) {
      console.error('Upload error:', error);
      alert('อัพโหลดรูปไม่สำเร็จ');
    } finally {
      setUploading(false);
    }
  };

  const handleSaveImage = async () => {
    if (!imageData.promotion_id || !currentPromo || !token) return;

    try {
      const response = await fetch(`${API_BASE}/promotions/${imageData.promotion_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          name: currentPromo.name,
          discount_type: currentPromo.discount_type,
          discount_value: currentPromo.discount_value || currentPromo.discount_percentage,
          start_date: currentPromo.start_date,
          end_date: currentPromo.end_date,
          product_id: currentPromo.product_id,
          description: currentPromo.description,
          image_url: imageData.image_url
        })
      });

      if (!response.ok) throw new Error('บันทึกรูปไม่สำเร็จ');
      alert('บันทึกรูปภาพสำเร็จ');
      fetchPromotions();
      closeImageModal();
    } catch (error) {
      console.error('Error:', error);
      alert('บันทึกรูปภาพไม่สำเร็จ');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('th-TH');
  };

  if (error) {
    return (
      <div style={styles.container}>
        <div style={styles.errorContainer}>
          <h2>⚠️ เกิดข้อผิดพลาด</h2>
          <p>{error}</p>
          <button onClick={() => window.location.reload()} style={styles.addButton}>โหลดใหม่</button>
        </div>
      </div>
    );
  }

  if (loading) return <div style={styles.loading}>กำลังโหลด...</div>;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>🎉 จัดการโปรโมชั่น</h1>
        <div style={styles.headerButtons}>
          <button onClick={openAddModal} style={styles.addButton}>➕ เพิ่มโปรโมชั่น</button>
          <button onClick={() => window.open('/admin/promotion-banners', '_blank')} style={styles.bannerButton}>
            🖼️ จัดการแบนเนอร์โปรโมชั่น
          </button>
        </div>
      </div>

      {promotions.length === 0 ? (
        <div style={styles.empty}>ไม่มีโปรโมชั่น</div>
      ) : (
        <div style={styles.grid}>
          {promotions.map((promo) => {
            const productName = promo.product_name || getProductName(promo.product_id);
            return (
              <div key={promo.promotion_id} style={styles.card}>
                {promo.image_url && (
                  <div style={styles.imageContainer}>
                    <img src={promo.image_url} alt={promo.name} style={styles.image}
                      onError={(e) => { e.target.src = 'https://placehold.co/400x200/eee/999?text=No+Image'; }} />
                  </div>
                )}
                <div style={styles.cardContent}>
                  <h3 style={styles.promoName}>{promo.name}</h3>
                  <div style={styles.infoRow}>
                    <span style={styles.label}>สินค้า:</span>
                    <span style={styles.productNameText}>{productName}</span>
                  </div>
                  <div style={styles.infoRow}>
                    <span style={styles.label}>ส่วนลด:</span>
                    <span style={styles.discount}>
                      {promo.discount_type === 'percent'
                        ? `${promo.discount_value || promo.discount_percentage || 0}%`
                        : `฿${promo.discount_value || promo.discount_percentage || 0}`}
                    </span>
                  </div>
                  <div style={styles.infoRow}>
                    <span style={styles.label}>ระยะเวลา:</span>
                    <span style={styles.dateText}>{formatDate(promo.start_date)} - {formatDate(promo.end_date)}</span>
                  </div>
                  {promo.description && <p style={styles.description}>{promo.description}</p>}
                  <div style={styles.actions}>
                    <button onClick={() => handleEdit(promo)} style={styles.editButton}>✏️ แก้ไข</button>
                    <button onClick={() => openImageModal(promo)} style={styles.imageButton}>🖼️ รูปภาพ</button>
                    <button onClick={() => handleDelete(promo.promotion_id)} style={styles.deleteButton}>🗑️ ลบ</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal เพิ่ม/แก้ไขโปรโมชั่น */}
      {showModal && (
        <>
          <div style={styles.overlay} onClick={closeModal} />
          <div style={styles.modal}>
            <div style={styles.modalHeader}>
              <h2>{editMode ? '✏️ แก้ไขโปรโมชั่น' : '➕ เพิ่มโปรโมชั่นใหม่'}</h2>
              <button onClick={closeModal} style={styles.closeButton}>✕</button>
            </div>
            <form onSubmit={handleSubmit} style={styles.form}>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>ชื่อโปรโมชั่น *</label>
                <input type="text" required value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  style={styles.input} placeholder="เช่น โปรโมชั่นลดราคา 50%" />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>สินค้า *</label>
                <select required value={formData.product_id}
                  onChange={(e) => setFormData({ ...formData, product_id: e.target.value })}
                  style={styles.select}>
                  <option value="">เลือกสินค้า</option>
                  {products.map((product) => (
                    <option key={product.product_id} value={product.product_id}>
                      {product.name} (ID: {product.product_id})
                    </option>
                  ))}
                </select>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>คำอธิบาย</label>
                <textarea value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  style={styles.textarea} rows="3" placeholder="รายละเอียดโปรโมชั่น" />
              </div>
              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>ประเภทส่วนลด *</label>
                  <select value={formData.discount_type}
                    onChange={(e) => setFormData({ ...formData, discount_type: e.target.value })}
                    style={styles.select}>
                    <option value="percent">เปอร์เซ็นต์ (%)</option>
                    <option value="fixed">จำนวนเงิน (฿)</option>
                  </select>
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>ส่วนลด *</label>
                  <input type="number" required min="0" step="0.01" value={formData.discount_value}
                    onChange={(e) => setFormData({ ...formData, discount_value: e.target.value })}
                    style={styles.input}
                    placeholder={formData.discount_type === 'percent' ? '0-100' : 'จำนวนเงิน'} />
                </div>
              </div>
              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>วันที่เริ่ม</label>
                  <input type="date" value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    style={styles.input} />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>วันที่สิ้นสุด</label>
                  <input type="date" value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    style={styles.input} />
                </div>
              </div>
              <div style={styles.modalActions}>
                <button type="button" onClick={closeModal} style={styles.cancelButton}>ยกเลิก</button>
                <button type="submit" style={styles.submitButton}>
                  {editMode ? 'บันทึกการแก้ไข' : 'เพิ่มโปรโมชั่น'}
                </button>
              </div>
            </form>
          </div>
        </>
      )}

      {/* Modal จัดการรูปภาพ */}
      {showImageModal && (
        <>
          <div style={styles.overlay} onClick={closeImageModal} />
          <div style={styles.modal}>
            <div style={styles.modalHeader}>
              <h2>🖼️ จัดการรูปภาพโปรโมชั่น</h2>
              <button onClick={closeImageModal} style={styles.closeButton}>✕</button>
            </div>
            <div style={styles.form}>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>อัพโหลดรูปภาพ</label>
                <input type="file" accept="image/*" onChange={handleImageUpload}
                  disabled={uploading} style={styles.fileInput} />
                {uploading && <p style={styles.uploadingText}>กำลังอัพโหลด...</p>}
              </div>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>หรือใส่ URL รูปภาพ</label>
                <input type="text" placeholder="https://example.com/image.jpg"
                  value={imageData.image_url}
                  onChange={(e) => setImageData({ ...imageData, image_url: e.target.value, preview: e.target.value })}
                  style={styles.input} />
              </div>
              {imageData.preview && (
                <div style={styles.previewContainer}>
                  <label style={styles.formLabel}>ตัวอย่าง:</label>
                  <img src={imageData.preview} alt="Preview" style={styles.preview}
                    onError={(e) => { e.target.src = 'https://placehold.co/400x300/eee/999?text=Invalid+URL'; }} />
                </div>
              )}
              <div style={styles.modalActions}>
                <button type="button" onClick={closeImageModal} style={styles.cancelButton}>ยกเลิก</button>
                <button type="button" onClick={handleSaveImage} style={styles.submitButton}>บันทึกรูปภาพ</button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

const styles = {
  container: { padding: '2rem' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' },
  headerButtons: { display: 'flex', gap: '1rem' },
  title: { fontSize: '2rem', fontWeight: 'bold', color: '#1a1a2e' },
  addButton: { padding: '0.75rem 1.5rem', backgroundColor: '#ee4d2d', color: 'white', border: 'none', borderRadius: '8px', fontSize: '1rem', fontWeight: '600', cursor: 'pointer' },
  bannerButton: { padding: '0.75rem 1.5rem', backgroundColor: '#2196F3', color: 'white', border: 'none', borderRadius: '8px', fontSize: '1rem', fontWeight: '600', cursor: 'pointer' },
  loading: { textAlign: 'center', padding: '3rem', fontSize: '1.2rem', color: '#666' },
  empty: { textAlign: 'center', padding: '3rem', fontSize: '1.2rem', color: '#999' },
  errorContainer: { textAlign: 'center', padding: '3rem', color: '#dc3545' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' },
  card: { backgroundColor: 'white', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' },
  imageContainer: { width: '100%', height: '200px', overflow: 'hidden', backgroundColor: '#f0f0f0' },
  image: { width: '100%', height: '100%', objectFit: 'cover' },
  cardContent: { padding: '1.5rem' },
  promoName: { fontSize: '1.3rem', fontWeight: 'bold', color: '#1a1a2e', marginBottom: '1rem' },
  infoRow: { display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', fontSize: '0.95rem' },
  label: { color: '#666', fontWeight: '500' },
  productNameText: { color: '#333', fontWeight: '600', textAlign: 'right' },
  discount: { color: '#ee4d2d', fontWeight: 'bold', fontSize: '1.1rem' },
  dateText: { fontSize: '0.9rem', color: '#666' },
  description: { fontSize: '0.9rem', color: '#666', marginTop: '0.75rem', marginBottom: '1rem', lineHeight: '1.4' },
  actions: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', marginTop: '1rem' },
  editButton: { padding: '0.6rem', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '600' },
  imageButton: { padding: '0.6rem', backgroundColor: '#2196F3', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '600' },
  deleteButton: { padding: '0.6rem', backgroundColor: '#f44336', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '600' },
  overlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 999 },
  modal: { position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', backgroundColor: 'white', borderRadius: '12px', width: '90%', maxWidth: '600px', maxHeight: '90vh', overflow: 'auto', zIndex: 1000, boxShadow: '0 10px 40px rgba(0,0,0,0.3)' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.5rem', borderBottom: '1px solid #e0e0e0' },
  closeButton: { background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#666' },
  form: { padding: '1.5rem' },
  formGroup: { marginBottom: '1.5rem' },
  formRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' },
  formLabel: { display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#333' },
  input: { width: '100%', padding: '0.75rem', border: '1px solid #ddd', borderRadius: '6px', fontSize: '1rem', outline: 'none' },
  textarea: { width: '100%', padding: '0.75rem', border: '1px solid #ddd', borderRadius: '6px', fontSize: '1rem', resize: 'vertical', outline: 'none' },
  select: { width: '100%', padding: '0.75rem', border: '1px solid #ddd', borderRadius: '6px', fontSize: '1rem', outline: 'none', backgroundColor: 'white' },
  fileInput: { width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '6px' },
  uploadingText: { color: '#ee4d2d', fontSize: '0.9rem', margin: '0.5rem 0' },
  previewContainer: { marginTop: '1rem' },
  preview: { width: '100%', maxHeight: '300px', objectFit: 'cover', borderRadius: '8px', marginTop: '0.5rem', border: '1px solid #ddd' },
  modalActions: { display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '2rem' },
  cancelButton: { padding: '0.75rem 1.5rem', backgroundColor: '#666', color: 'white', border: 'none', borderRadius: '6px', fontSize: '1rem', fontWeight: '600', cursor: 'pointer' },
  submitButton: { padding: '0.75rem 1.5rem', backgroundColor: '#ee4d2d', color: 'white', border: 'none', borderRadius: '6px', fontSize: '1rem', fontWeight: '600', cursor: 'pointer' },
};

export default Promotions;