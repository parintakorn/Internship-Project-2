import { useState, useEffect, useContext, useRef } from 'react';
import { AuthContext } from '../../context/AuthContext';

const API_BASE = `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api`;

const ProductManagement = () => {
  const { token } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState('products');
  const [products, setProducts] = useState([]);
  const [promotions, setPromotions] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingPromotions, setLoadingPromotions] = useState(true);
  const [productsError, setProductsError] = useState(null);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showPromoModal, setShowPromoModal] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [editPromotion, setEditPromotion] = useState(null);

  // Drag & Drop state
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragItem = useRef(null);
  const dragOverItem = useRef(null);

  const [formData, setFormData] = useState({
    name: '', price: '', stock: '', description: '',
    category_id: '', image_url: '', country: '',
    size: '', weight: '', weight_unit: 'kg', qr_code: ''
  });

  const [uploading, setUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState('');

  const [promoFormData, setPromoFormData] = useState({
    product_id: '', discount_percentage: '',
    start_date: '', end_date: '', description: ''
  });

  const formatDate = (isoString) => {
    if (!isoString) return '-';
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const getProductNameById = (productId) => {
    const product = products.find(p => p.product_id === productId);
    return product?.name || 'สินค้าไม่ระบุ';
  };

  const fetchProducts = async () => {
    setLoadingProducts(true);
    setProductsError(null);
    try {
      const res = await fetch(`${API_BASE}/products`, {
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      if (!res.ok) throw new Error(`โหลดสินค้าไม่สำเร็จ: ${res.status}`);
      const data = await res.json();
      setProducts(Array.isArray(data) ? data : (data.products || []));
    } catch (err) {
      setProductsError(err.message);
    } finally {
      setLoadingProducts(false);
    }
  };

  const fetchPromotions = async () => {
    setLoadingPromotions(true);
    try {
      const res = await fetch(`${API_BASE}/promotions`, {
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      if (!res.ok) { setPromotions([]); return; }
      const data = await res.json();
      setPromotions(Array.isArray(data) ? data : (data.promotions || []));
    } catch (err) {
      setPromotions([]);
    } finally {
      setLoadingPromotions(false);
    }
  };

  useEffect(() => {
    if (!token) { setProductsError('ไม่มี token - กรุณาล็อกอินใหม่'); setLoadingProducts(false); return; }
    fetchProducts();
    fetchPromotions();
  }, [token]);

  // ── Drag & Drop handlers ──────────────────────────────────────────
  const handleDragStart = (e, index) => {
    dragItem.current = index;
    setDraggedIndex(index);
    setIsDragging(true);
    e.dataTransfer.effectAllowed = 'move';
    // Ghost image delay so original stays visible briefly
    setTimeout(() => {
      setDraggedIndex(index);
    }, 0);
  };

  const handleDragEnter = (e, index) => {
    e.preventDefault();
    dragOverItem.current = index;
    setDragOverIndex(index);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, index) => {
    e.preventDefault();
    if (dragItem.current === null || dragItem.current === index) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      setIsDragging(false);
      return;
    }

    const newProducts = [...filteredProducts];
    const draggedProduct = newProducts[dragItem.current];
    newProducts.splice(dragItem.current, 1);
    newProducts.splice(index, 0, draggedProduct);

    // Update full products array preserving non-filtered items
    if (search) {
      // If searching, just reorder within filtered view
      setProducts(prev => {
        const filtered = prev.filter(p => (p.name || '').toLowerCase().includes(search.toLowerCase()));
        const rest = prev.filter(p => !(p.name || '').toLowerCase().includes(search.toLowerCase()));
        return [...newProducts, ...rest];
      });
    } else {
      setProducts(newProducts);
    }

    dragItem.current = null;
    dragOverItem.current = null;
    setDraggedIndex(null);
    setDragOverIndex(null);
    setIsDragging(false);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
    setIsDragging(false);
    dragItem.current = null;
    dragOverItem.current = null;
  };

  // Move up/down buttons (alternative to drag)
  const moveProduct = (index, direction) => {
    const newProducts = [...products];
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= newProducts.length) return;
    [newProducts[index], newProducts[targetIndex]] = [newProducts[targetIndex], newProducts[index]];
    setProducts(newProducts);
  };
  // ─────────────────────────────────────────────────────────────────

  const handleImageUpload = async (file) => {
    if (!file || !token) return;
    setUploading(true);
    const formDataUpload = new FormData();
    formDataUpload.append('image', file);
    try {
      const res = await fetch(`${API_BASE}/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formDataUpload
      });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.message || 'อัปโหลดรูปไม่สำเร็จ'); }
      const data = await res.json();
      setFormData(prev => ({ ...prev, image_url: data.url }));
      const previewUrl = data.url.startsWith('http') ? data.url : `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}${data.url}`;
      setImagePreview(previewUrl);
      alert('✅ อัปโหลดรูปสำเร็จ!');
    } catch (err) {
      alert('❌ เกิดข้อผิดพลาด: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleProductSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.price || !formData.stock) { alert('กรุณากรอกข้อมูลที่จำเป็นให้ครบ!'); return; }
    if (!token) { alert('กรุณาล็อกอินก่อนทำรายการนี้'); return; }
    const isEditing = !!editProduct;
    const url = isEditing ? `${API_BASE}/products/${editProduct.product_id}` : `${API_BASE}/products`;
    const method = isEditing ? 'PUT' : 'POST';
    try {
      const payload = {
        name: formData.name, price: parseFloat(formData.price), stock: parseInt(formData.stock, 10),
        description: formData.description || null, category_id: formData.category_id ? parseInt(formData.category_id, 10) : null,
        image_url: formData.image_url || null, country: formData.country || null, size: formData.size || null,
        weight: formData.weight ? parseFloat(formData.weight) : null, weight_unit: formData.weight_unit || 'kg',
        qr_code: formData.qr_code || (editProduct ? editProduct.qr_code : null)
      };
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify(payload) });
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.message || 'บันทึกสินค้าไม่สำเร็จ'); }
      alert(isEditing ? 'อัปเดตสินค้าสำเร็จ!' : 'เพิ่มสินค้าสำเร็จ!');
      resetProductForm();
      fetchProducts();
    } catch (err) { alert('เกิดข้อผิดพลาด: ' + err.message); }
  };

  const handleDeleteProduct = async (productId) => {
    if (!window.confirm('ยืนยันการลบสินค้านี้?')) return;
    if (!token) { alert('กรุณาล็อกอินก่อนทำรายการนี้'); return; }
    try {
      const res = await fetch(`${API_BASE}/products/${productId}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.message || 'ลบสินค้าไม่สำเร็จ'); }
      setProducts(prev => prev.filter(p => p.product_id !== productId));
      alert('ลบสินค้าสำเร็จ!');
    } catch (err) { alert('เกิดข้อผิดพลาด: ' + err.message); }
  };

  const openEditProduct = (product) => {
    setEditProduct(product);
    setFormData({ name: product.name || '', price: product.price || '', stock: product.stock || '', description: product.description || '', category_id: product.category_id || '', image_url: product.image_url || '', country: product.country || '', size: product.size || '', weight: product.weight != null ? String(product.weight) : '', weight_unit: product.weight_unit || 'kg', qr_code: product.qr_code || '' });
    setImagePreview(product.image_url || '');
    setShowModal(true);
  };

  const resetProductForm = () => {
    setShowModal(false); setEditProduct(null); setImagePreview('');
    setFormData({ name: '', price: '', stock: '', description: '', category_id: '', image_url: '', country: '', size: '', weight: '', weight_unit: 'kg', qr_code: '' });
  };

  const handlePromotionSubmit = async (e) => {
    e.preventDefault();
    if (!promoFormData.product_id || !promoFormData.discount_percentage) { alert('กรุณาเลือกสินค้าและระบุส่วนลด!'); return; }
    if (!token) { alert('กรุณาล็อกอินก่อนทำรายการนี้'); return; }
    const isEditing = !!editPromotion;
    const url = isEditing ? `${API_BASE}/promotions/${editPromotion.promotion_id}` : `${API_BASE}/promotions`;
    const method = isEditing ? 'PUT' : 'POST';
    try {
      const selectedProduct = products.find(p => p.product_id === Number(promoFormData.product_id));
      const payload = { name: `โปรโมชั่นสำหรับ ${selectedProduct?.name || 'สินค้า'} ลด ${promoFormData.discount_percentage}%`, discount_type: 'percent', discount_value: parseFloat(promoFormData.discount_percentage), start_date: promoFormData.start_date || null, end_date: promoFormData.end_date || null, description: promoFormData.description || null, product_id: Number(promoFormData.product_id) };
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify(payload) });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.message || `บันทึกโปรโมชั่นไม่สำเร็จ (${res.status})`); }
      alert(isEditing ? 'อัปเดตโปรโมชั่นสำเร็จ!' : 'เพิ่มโปรโมชั่นสำเร็จ!');
      resetPromotionForm();
      fetchPromotions();
    } catch (err) { alert('เกิดข้อผิดพลาด: ' + err.message); }
  };

  const handleDeletePromotion = async (promoId) => {
    if (!promoId) { alert('ไม่พบ ID ของโปรโมชั่น'); return; }
    if (!window.confirm('ยืนยันการลบโปรโมชั่นนี้?')) return;
    if (!token) { alert('กรุณาล็อกอินก่อนทำรายการนี้'); return; }
    try {
      const res = await fetch(`${API_BASE}/promotions/${promoId}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.message || 'ลบโปรโมชั่นไม่สำเร็จ'); }
      setPromotions(prev => prev.filter(p => p.promotion_id !== promoId));
      alert('ลบโปรโมชั่นสำเร็จ!');
    } catch (err) { alert('เกิดข้อผิดพลาดตอนลบ: ' + err.message); }
  };

  const openEditPromotion = (promo) => {
    setEditPromotion(promo);
    setPromoFormData({ product_id: promo.product_id || '', discount_percentage: promo.discount_percentage || promo.discount_value || '', start_date: promo.start_date ? promo.start_date.split('T')[0] : '', end_date: promo.end_date ? promo.end_date.split('T')[0] : '', description: promo.description || '' });
    setShowPromoModal(true);
  };

  const resetPromotionForm = () => {
    setShowPromoModal(false); setEditPromotion(null);
    setPromoFormData({ product_id: '', discount_percentage: '', start_date: '', end_date: '', description: '' });
  };

  const filteredProducts = products.filter(p =>
    (p.name || '').toLowerCase().includes(search.toLowerCase())
  );

  if (productsError) {
    return (
      <div style={styles.container}>
        <div style={{ color: 'red', textAlign: 'center', padding: '4rem 1rem' }}>
          <h2>เกิดข้อผิดพลาดในการโหลดสินค้า</h2>
          <p>{productsError}</p>
          <button onClick={() => window.location.reload()} style={styles.saveBtn}>ลองโหลดใหม่</button>
        </div>
      </div>
    );
  }

  const isLoading = loadingProducts || loadingPromotions;

  return (
    <div style={styles.container}>
      <div style={styles.tabs}>
        <button onClick={() => setActiveTab('products')} style={{ ...styles.tab, ...(activeTab === 'products' ? styles.activeTab : {}) }}>
          📦 จัดการสินค้า
        </button>
        <button onClick={() => setActiveTab('promotions')} style={{ ...styles.tab, ...(activeTab === 'promotions' ? styles.activeTab : {}) }}>
          🏷️ จัดการโปรโมชั่น
        </button>
      </div>

      {isLoading ? (
        <div style={styles.loading}>กำลังโหลดข้อมูล...</div>
      ) : (
        <>
          {activeTab === 'products' && (
            <div>
              <div style={styles.header}>
                <h1 style={styles.title}>จัดการสินค้า</h1>
                <button onClick={() => setShowModal(true)} style={styles.addBtn}>+ เพิ่มสินค้าใหม่</button>
              </div>

              <div style={styles.searchContainer}>
                <input type="text" placeholder="🔍 ค้นหาสินค้า..." value={search}
                  onChange={(e) => setSearch(e.target.value)} style={styles.searchInput} />
              </div>

              {/* Drag hint */}
              {filteredProducts.length > 1 && (
                <div style={styles.dragHint}>
                  <span>⠿</span> ลากการ์ดเพื่อเรียงลำดับสินค้า หรือใช้ปุ่ม ↑ ↓
                </div>
              )}

              {filteredProducts.length === 0 ? (
                <p style={{ textAlign: 'center', padding: '3rem', color: '#777' }}>ไม่พบสินค้าที่ตรงกับการค้นหา</p>
              ) : (
                <div style={styles.productsGrid}>
                  {filteredProducts.map((product, index) => {
                    const isDragged = draggedIndex === index;
                    const isDragOver = dragOverIndex === index;

                    return (
                      <div
                        key={product.product_id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, index)}
                        onDragEnter={(e) => handleDragEnter(e, index)}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, index)}
                        onDragEnd={handleDragEnd}
                        style={{
                          ...styles.productCard,
                          opacity: isDragged ? 0.4 : 1,
                          transform: isDragOver && !isDragged ? 'scale(1.02) translateY(-4px)' : 'scale(1)',
                          boxShadow: isDragOver && !isDragged
                            ? '0 12px 32px rgba(40,167,69,0.35), 0 0 0 2px #28a745'
                            : isDragged
                              ? '0 2px 8px rgba(0,0,0,0.08)'
                              : '0 2px 8px rgba(0,0,0,0.1)',
                          cursor: isDragging ? 'grabbing' : 'grab',
                          transition: 'transform 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease',
                          outline: isDragOver && !isDragged ? '2px dashed #28a745' : 'none',
                          borderRadius: '12px',
                        }}
                      >
                        {/* Drag handle bar */}
                        <div style={styles.dragHandle} title="ลากเพื่อเรียงลำดับ">
                          <span style={{ letterSpacing: '2px', color: '#bbb', fontSize: '18px' }}>⠿⠿⠿</span>
                          <span style={styles.orderBadge}>#{index + 1}</span>
                        </div>

                        <img
                          src={
                            !product.image_url
                              ? `https://placehold.co/250x250/eee/333?text=No+Image`
                              : product.image_url.startsWith('http')
                                ? product.image_url
                                : `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}${product.image_url}`
                          }
                          alt={product.name || 'สินค้า'}
                          style={styles.productImage}
                          onError={(e) => { e.target.src = 'https://placehold.co/250x250/ccc/999?text=Error'; }}
                          draggable={false}
                        />

                        <div style={styles.productInfo}>
                          <h3 style={styles.productName}>{product.name || 'ไม่ระบุชื่อ'}</h3>
                          <p style={styles.productCategory}>{product.category_name || 'ไม่มีหมวดหมู่'}</p>
                          {product.country && <p style={styles.productMeta}>From: {product.country}</p>}
                          {product.size && <p style={styles.productMeta}>📏 ไซส์: {product.size}</p>}
                          {product.weight && <p style={styles.productMeta}>Size: {product.weight} {product.weight_unit}</p>}
                          <div style={styles.productDetails}>
                            <span style={styles.productPrice}>฿{(Number(product.price) || 0).toLocaleString()}</span>
                            <span style={styles.productStock}>คลัง: {product.stock ?? '?'} ชิ้น</span>
                          </div>
                          {product.description && <p style={styles.productDesc}>{product.description}</p>}

                          {/* Move buttons + Edit/Delete */}
                          <div style={styles.productActions}>
                            <button
                              onClick={() => moveProduct(
                                products.findIndex(p => p.product_id === product.product_id),
                                -1
                              )}
                              style={styles.moveBtn}
                              disabled={products.findIndex(p => p.product_id === product.product_id) === 0}
                              title="เลื่อนขึ้น"
                            >↑</button>
                            <button
                              onClick={() => moveProduct(
                                products.findIndex(p => p.product_id === product.product_id),
                                1
                              )}
                              style={styles.moveBtn}
                              disabled={products.findIndex(p => p.product_id === product.product_id) === products.length - 1}
                              title="เลื่อนลง"
                            >↓</button>
                            <button onClick={() => openEditProduct(product)} style={styles.editBtn}>แก้ไข</button>
                            <button onClick={() => handleDeleteProduct(product.product_id)} style={styles.deleteBtn}>ลบ</button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === 'promotions' && (
            <div>
              <div style={styles.header}>
                <h1 style={styles.title}>จัดการโปรโมชั่น</h1>
                <button onClick={() => setShowPromoModal(true)} style={styles.addBtn}>+ เพิ่มโปรโมชั่นใหม่</button>
              </div>
              {promotions.length === 0 ? (
                <p style={{ textAlign: 'center', padding: '3rem', color: '#777' }}>ยังไม่มีโปรโมชั่นในระบบ</p>
              ) : (
                <div style={styles.promoList}>
                  {promotions.map(promo => {
                    const productName = promo.product_name || getProductNameById(promo.product_id);
                    return (
                      <div key={promo.promotion_id} style={styles.promoCard}>
                        <div style={styles.promoHeader}>
                          <h3 style={styles.promoTitle}>{productName}</h3>
                          <span style={styles.promoBadge}>-{promo.discount_percentage || promo.discount_value || 0}%</span>
                        </div>
                        <p style={styles.promoDesc}>{promo.description || promo.name || '-'}</p>
                        <div style={styles.promoDate}>
                          <span>📅 {formatDate(promo.start_date)} ถึง {formatDate(promo.end_date)}</span>
                        </div>
                        <div style={styles.promoActions}>
                          <button onClick={() => openEditPromotion(promo)} style={styles.editBtn}>แก้ไข</button>
                          <button onClick={() => handleDeletePromotion(promo.promotion_id)} style={styles.deleteBtn}>ลบ</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Modal สินค้า */}
      {showModal && (
        <div style={styles.modalOverlay} onClick={resetProductForm}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <h2 style={styles.modalTitle}>{editProduct ? 'แก้ไขสินค้า' : 'เพิ่มสินค้าใหม่'}</h2>
            <form onSubmit={handleProductSubmit} style={styles.formContainer}>
              <input type="text" placeholder="ชื่อสินค้า *" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} style={styles.input} required />
              <input type="number" placeholder="ราคา *" value={formData.price} onChange={e => setFormData({ ...formData, price: e.target.value })} style={styles.input} step="0.01" min="0" required />
              <input type="number" placeholder="จำนวนในคลัง *" value={formData.stock} onChange={e => setFormData({ ...formData, stock: e.target.value })} style={styles.input} min="0" required />
              <input type="number" placeholder="Category ID (ถ้ามี)" value={formData.category_id} onChange={e => setFormData({ ...formData, category_id: e.target.value })} style={styles.input} min="1" />
              <textarea placeholder="รายละเอียด" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} style={styles.textarea} rows="3" />
              <input type="text" placeholder="ประเทศต้นกำเนิด" value={formData.country} onChange={e => setFormData({ ...formData, country: e.target.value })} style={styles.input} />
              <input type="text" placeholder="ไซส์" value={formData.size} onChange={e => setFormData({ ...formData, size: e.target.value })} style={styles.input} />
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input type="number" placeholder="น้ำหนัก" value={formData.weight} onChange={e => setFormData({ ...formData, weight: e.target.value })} style={{ ...styles.input, flex: 2 }} step="0.01" min="0" />
                <select value={formData.weight_unit} onChange={e => setFormData({ ...formData, weight_unit: e.target.value })} style={{ ...styles.input, flex: 1 }}>
                  <option value="kg">kg</option><option value="g">g</option><option value="lb">lb</option>
                  <option value="oz">oz</option><option value="ชิ้น">ชิ้น</option><option value="ตัว">ตัว</option>
                  <option value="กล่อง">กล่อง</option><option value="แพ็ค">แพ็ค</option><option value="กระป๋อง">กระป๋อง</option>
                </select>
              </div>
              <input type="text" placeholder="QR Code" value={formData.qr_code} onChange={e => setFormData({ ...formData, qr_code: e.target.value })} style={styles.input} />
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: '#333' }}>📸 อัปโหลดรูปภาพ</label>
                <input type="file" accept="image/*" onChange={(e) => { const f = e.target.files[0]; if (f) handleImageUpload(f); }} style={styles.input} disabled={uploading} />
                {uploading && <p style={{ color: '#007bff', fontSize: '0.9rem' }}>⏳ กำลังอัปโหลด...</p>}
                {imagePreview && <img src={imagePreview} alt="Preview" style={{ width: '100%', maxWidth: '200px', marginTop: '0.5rem' }} />}
              </div>
              <input type="text" placeholder="หรือใส่ URL รูปภาพ" value={formData.image_url}
                onChange={e => { setFormData({ ...formData, image_url: e.target.value }); setImagePreview(e.target.value); }} style={styles.input} />
              <div style={styles.modalActions}>
                <button type="submit" style={styles.saveBtn}>{editProduct ? 'บันทึกการแก้ไข' : 'เพิ่มสินค้า'}</button>
                <button type="button" onClick={resetProductForm} style={styles.cancelBtn}>ยกเลิก</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal โปรโมชั่น */}
      {showPromoModal && (
        <div style={styles.modalOverlay} onClick={resetPromotionForm}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <h2 style={styles.modalTitle}>{editPromotion ? 'แก้ไขโปรโมชั่น' : 'เพิ่มโปรโมชั่นใหม่'}</h2>
            <form onSubmit={handlePromotionSubmit} style={styles.formContainer}>
              <select value={promoFormData.product_id} onChange={e => setPromoFormData({ ...promoFormData, product_id: e.target.value })} style={styles.input} required>
                <option value="">เลือกสินค้า *</option>
                {products.map(p => <option key={p.product_id} value={p.product_id}>{p.name} (ID: {p.product_id})</option>)}
              </select>
              <input type="number" placeholder="ส่วนลด (%) *" value={promoFormData.discount_percentage} onChange={e => setPromoFormData({ ...promoFormData, discount_percentage: e.target.value })} style={styles.input} min="0" max="100" step="0.01" required />
              <input type="date" value={promoFormData.start_date} onChange={e => setPromoFormData({ ...promoFormData, start_date: e.target.value })} style={styles.input} required />
              <input type="date" value={promoFormData.end_date} onChange={e => setPromoFormData({ ...promoFormData, end_date: e.target.value })} style={styles.input} required />
              <textarea placeholder="รายละเอียดโปรโมชั่น" value={promoFormData.description} onChange={e => setPromoFormData({ ...promoFormData, description: e.target.value })} style={styles.textarea} rows="3" />
              <div style={styles.modalActions}>
                <button type="submit" style={styles.saveBtn}>{editPromotion ? 'บันทึกการแก้ไข' : 'เพิ่มโปรโมชั่น'}</button>
                <button type="button" onClick={resetPromotionForm} style={styles.cancelBtn}>ยกเลิก</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: { maxWidth: '1400px', margin: '0 auto', padding: '2rem', backgroundColor: '#f5f5f5', minHeight: '100vh' },
  tabs: { display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '2px solid #ddd' },
  tab: { padding: '1rem 2rem', backgroundColor: 'transparent', border: 'none', borderBottom: '3px solid transparent', fontSize: '1rem', fontWeight: '500', cursor: 'pointer', color: '#666', transition: 'all 0.3s' },
  activeTab: { color: '#ee4d2d', borderBottom: '3px solid #ee4d2d' },
  loading: { textAlign: 'center', padding: '3rem', fontSize: '1.2rem', color: '#666' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' },
  title: { fontSize: '2rem', color: '#333', margin: 0 },
  addBtn: { padding: '0.75rem 1.5rem', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '8px', fontSize: '1rem', fontWeight: '500', cursor: 'pointer' },
  searchContainer: { marginBottom: '1rem' },
  searchInput: { width: '100%', padding: '0.75rem 1rem', border: '1px solid #ddd', borderRadius: '8px', fontSize: '1rem', outline: 'none', boxSizing: 'border-box' },
  dragHint: { display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', padding: '0.6rem 1rem', backgroundColor: '#e8f5e9', border: '1px dashed #28a745', borderRadius: '8px', fontSize: '0.875rem', color: '#2e7d32', userSelect: 'none' },
  productsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' },
  productCard: { backgroundColor: 'white', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', userSelect: 'none' },
  dragHandle: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 12px', backgroundColor: '#f8f9fa', borderBottom: '1px solid #eee', cursor: 'grab' },
  orderBadge: { fontSize: '11px', fontWeight: '700', color: '#fff', backgroundColor: '#6c757d', borderRadius: '10px', padding: '2px 8px' },
  productImage: { width: '100%', height: '200px', objectFit: 'cover', pointerEvents: 'none' },
  productInfo: { padding: '1rem' },
  productName: { fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '0.5rem', color: '#333' },
  productCategory: { fontSize: '0.85rem', color: '#999', marginBottom: '0.5rem' },
  productMeta: { fontSize: '0.85rem', color: '#666', marginBottom: '0.3rem' },
  productDetails: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' },
  productPrice: { fontSize: '1.3rem', fontWeight: 'bold', color: '#ee4d2d' },
  productStock: { fontSize: '0.9rem', color: '#666' },
  productDesc: { fontSize: '0.9rem', color: '#666', marginBottom: '1rem', lineHeight: '1.4' },
  productActions: { display: 'flex', gap: '0.4rem' },
  moveBtn: { padding: '0.4rem 0.6rem', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 'bold', lineHeight: 1 },
  editBtn: { flex: 1, padding: '0.5rem', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.9rem' },
  deleteBtn: { flex: 1, padding: '0.5rem', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.9rem' },
  promoList: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.5rem' },
  promoCard: { backgroundColor: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' },
  promoHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' },
  promoTitle: { fontSize: '1.2rem', fontWeight: 'bold', color: '#333', margin: 0 },
  promoBadge: { backgroundColor: '#ff4757', color: 'white', padding: '0.4rem 0.8rem', borderRadius: '20px', fontSize: '1rem', fontWeight: 'bold' },
  promoDesc: { fontSize: '0.95rem', color: '#666', marginBottom: '1rem' },
  promoDate: { fontSize: '0.9rem', color: '#999', marginBottom: '1rem' },
  promoActions: { display: 'flex', gap: '0.5rem' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999, overflow: 'auto', padding: '20px' },
  modal: { backgroundColor: 'white', borderRadius: '12px', padding: '2rem', width: '90%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto' },
  modalTitle: { fontSize: '1.5rem', marginBottom: '1.5rem', color: '#333' },
  formContainer: { display: 'flex', flexDirection: 'column', gap: '1rem' },
  input: { padding: '0.75rem', border: '1px solid #ddd', borderRadius: '6px', fontSize: '1rem' },
  textarea: { padding: '0.75rem', border: '1px solid #ddd', borderRadius: '6px', fontSize: '1rem', resize: 'vertical' },
  modalActions: { display: 'flex', gap: '1rem', marginTop: '1rem' },
  saveBtn: { flex: 1, padding: '0.75rem', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '6px', fontSize: '1rem', fontWeight: '500', cursor: 'pointer' },
  cancelBtn: { flex: 1, padding: '0.75rem', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '6px', fontSize: '1rem', cursor: 'pointer' },
};

export default ProductManagement;