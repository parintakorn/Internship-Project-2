import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import './PromotionBanners.css';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const PromotionBanners = () => {
    const { token } = useContext(AuthContext);
    const [banners, setBanners] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingBanner, setEditingBanner] = useState(null);

    const [formData, setFormData] = useState({
        title: '',
        link_url: '',
        display_order: 0,
        is_active: true,
        image: null
    });

    // ดึงข้อมูลแบนเนอร์
    const fetchBanners = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${API_BASE}/api/banners/admin/all`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const data = await response.json();
            if (data.success) {
                setBanners(data.banners || []);
            }
        } catch (error) {
            console.error('Error fetching banners:', error);
            alert('เกิดข้อผิดพลาดในการโหลดข้อมูล');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBanners();
    }, []);

    // เปิด Modal เพิ่ม/แก้ไข
    const openModal = (banner = null) => {
        if (banner) {
            setEditingBanner(banner);
            setFormData({
                title: banner.title,
                link_url: banner.link_url || '',
                display_order: banner.display_order,
                is_active: banner.is_active,
                image: null
            });
        } else {
            setEditingBanner(null);
            setFormData({
                title: '',
                link_url: '',
                display_order: 0,
                is_active: true,
                image: null
            });
        }
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingBanner(null);
        setFormData({
            title: '',
            link_url: '',
            display_order: 0,
            is_active: true,
            image: null
        });
    };

    // Submit Form
    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!editingBanner && !formData.image) {
            alert('กรุณาเลือกรูปภาพ');
            return;
        }

        try {
            const form = new FormData();
            form.append('title', formData.title);
            form.append('link_url', formData.link_url);
            form.append('display_order', formData.display_order);
            form.append('is_active', formData.is_active);

            if (formData.image) {
                form.append('image', formData.image);
            }

            const url = editingBanner
                ? `${API_BASE}/api/banners/admin/${editingBanner.id}`
                : `${API_BASE}/api/banners/admin`;

            const method = editingBanner ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: form
            });

            const data = await response.json();

            if (data.success) {
                alert(data.message);
                closeModal();
                fetchBanners();
            } else {
                alert(data.message || 'เกิดข้อผิดพลาด');
            }
        } catch (error) {
            console.error('Error saving banner:', error);
            alert('เกิดข้อผิดพลาดในการบันทึก');
        }
    };

    // ลบแบนเนอร์
    const handleDelete = async (id) => {
        if (!confirm('คุณต้องการลบแบนเนอร์นี้หรือไม่?')) return;

        try {
            const response = await fetch(`${API_BASE}/api/banners/admin/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const data = await response.json();

            if (data.success) {
                alert(data.message);
                fetchBanners();
            } else {
                alert(data.message || 'เกิดข้อผิดพลาด');
            }
        } catch (error) {
            console.error('Error deleting banner:', error);
            alert('เกิดข้อผิดพลาดในการลบ');
        }
    };

    if (loading) {
        return <div className="loading">กำลังโหลด...</div>;
    }

    return (
        <div className="promotion-banners-admin">
            <div className="header">
                <h1>🖼️ จัดการแบนเนอร์โปรโมชั่น</h1>
                <button className="btn-add" onClick={() => openModal()}>
                    + เพิ่มแบนเนอร์
                </button>
            </div>

            {banners.length === 0 ? (
                <div className="empty-state">
                    <p>ยังไม่มีแบนเนอร์</p>
                    <button onClick={() => openModal()}>เพิ่มแบนเนอร์แรก</button>
                </div>
            ) : (
                <div className="banners-grid">
                    {banners.map((banner) => (
                        <div 
                            key={banner.id} 
                            className={`banner-card ${!banner.is_active ? 'inactive' : ''}`}
                        >
                            <div className="banner-image">
                                <img 
                                    src={`${API_BASE}${banner.image_url}`} 
                                    alt={banner.title}
                                    onError={(e) => e.target.src = '/placeholder.png'}
                                />
                                {!banner.is_active && (
                                    <div className="inactive-overlay">ปิดการแสดง</div>
                                )}
                            </div>

                            <div className="banner-info">
                                <h3>{banner.title}</h3>
                                <p>ลำดับ: {banner.display_order}</p>
                                {banner.link_url && (
                                    <p className="link">🔗 {banner.link_url}</p>
                                )}
                                <p style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: banner.is_active ? '#10b981' : '#ef4444' }}>
                                    สถานะ: {banner.is_active ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
                                </p>
                            </div>

                            <div className="banner-actions">
                                <button 
                                    className="btn-edit"
                                    onClick={() => openModal(banner)}
                                >
                                    ✏️ แก้ไข
                                </button>
                                <button 
                                    className="btn-delete"
                                    onClick={() => handleDelete(banner.id)}
                                >
                                    🗑️ ลบ
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={closeModal}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{editingBanner ? 'แก้ไขแบนเนอร์' : 'เพิ่มแบนเนอร์ใหม่'}</h2>
                            <button className="btn-close" onClick={closeModal}>✕</button>
                        </div>

                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label>ชื่อแบนเนอร์</label>
                                <input
                                    type="text"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label>รูปภาพ {editingBanner && '(เว้นว่างถ้าไม่ต้องการเปลี่ยน)'}</label>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => setFormData({ ...formData, image: e.target.files[0] })}
                                />
                            </div>

                            <div className="form-group">
                                <label>ลิงก์ (ถ้ามี)</label>
                                <input
                                    type="url"
                                    value={formData.link_url}
                                    onChange={(e) => setFormData({ ...formData, link_url: e.target.value })}
                                    placeholder="https://..."
                                />
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>ลำดับการแสดง</label>
                                    <input
                                        type="number"
                                        value={formData.display_order}
                                        onChange={(e) => setFormData({ ...formData, display_order: e.target.value })}
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="checkbox-label">
                                        <input
                                            type="checkbox"
                                            checked={formData.is_active}
                                            onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                        />
                                        เปิดการแสดง
                                    </label>
                                </div>
                            </div>

                            <div className="modal-actions">
                                <button type="button" className="btn-cancel" onClick={closeModal}>
                                    ยกเลิก
                                </button>
                                <button type="submit" className="btn-submit">
                                    {editingBanner ? 'บันทึก' : 'เพิ่มแบนเนอร์'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PromotionBanners;