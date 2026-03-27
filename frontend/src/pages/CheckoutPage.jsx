import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { AuthContext } from '../context/AuthContext';
import api from '../api/axios';

const CheckoutPage = () => {
    const { 
        cartItems, 
        getTotalPrice, 
        getTotalWithPromotions, // ✅ เพิ่ม
        getTotalDiscount, // ✅ เพิ่ม
        getProductPromotion, // ✅ เพิ่ม
        calculateDiscountedPrice, // ✅ เพิ่ม
        clearCart 
    } = useCart();
    
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);

    const [shippingInfo, setShippingInfo] = useState({
        fullName: '',
        phone: '',
        address: '',
        district: '',
        province: '',
        postalCode: ''
    });

    const [paymentMethod, setPaymentMethod] = useState('promptpay');

    useEffect(() => {
        if (user) {
            setShippingInfo({
                fullName: user.name || '',
                phone: user.phone || '',
                address: user.address || '',
                district: user.district || '',
                province: user.province || '',
                postalCode: user.postal_code || ''
            });
        }
    }, [user]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setShippingInfo(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const validateForm = () => {
        if (!shippingInfo.fullName.trim()) {
            alert('กรุณากรอกชื่อ-นามสกุล');
            return false;
        }
        if (!shippingInfo.phone.trim()) {
            alert('กรุณากรอกเบอร์โทรศัพท์');
            return false;
        }
        if (shippingInfo.phone.length < 10) {
            alert('เบอร์โทรศัพท์ไม่ถูกต้อง');
            return false;
        }
        if (!shippingInfo.address.trim()) {
            alert('กรุณากรอกที่อยู่');
            return false;
        }
        if (!shippingInfo.district.trim()) {
            alert('กรุณากรอกอำเภอ/เขต');
            return false;
        }
        if (!shippingInfo.province.trim()) {
            alert('กรุณากรอกจังหวัด');
            return false;
        }
        if (!shippingInfo.postalCode.trim()) {
            alert('กรุณากรอกรหัสไปรษณีย์');
            return false;
        }
        return true;
    };

    const handleSubmitOrder = async (e) => {
        e.preventDefault();

        if (cartItems.length === 0) {
            alert('ตะกร้าสินค้าว่างเปล่า');
            navigate('/cart');
            return;
        }

        if (!validateForm()) {
            return;
        }

        setLoading(true);

        try {
            // ✅ ใช้ราคาหลังหักโปรโมชั่น
            const shippingFee = 0;
            const finalTotal = getTotalWithPromotions() + shippingFee;

            // เตรียมข้อมูลคำสั่งซื้อ
            const orderData = {
                items: cartItems.map(item => {
                    const discountedPrice = calculateDiscountedPrice(item);
                    const promo = getProductPromotion(item.product_id);
                    
                    return {
                        product_id: item.product_id,
                        quantity: item.quantity,
                        price: Math.floor(discountedPrice), // ✅ ใช้ราคาหลังหักส่วนลด
                        original_price: item.price, // ✅ เก็บราคาเต็มไว้ด้วย (optional)
                        promotion_id: promo?.promotion_id || null // ✅ เก็บ promotion_id (optional)
                    };
                }),
                total_price: Math.floor(finalTotal), // ✅ ใช้ราคาหลังหักส่วนลด + ค่าส่ง
                
                customer_name: shippingInfo.fullName,
                customer_phone: shippingInfo.phone,
                
                shipping_address: {
                    full_address: shippingInfo.address,
                    district: shippingInfo.district,
                    province: shippingInfo.province,
                    postal_code: shippingInfo.postalCode,
                    full_name: shippingInfo.fullName,
                    phone: shippingInfo.phone
                },

                email: user?.email || '',
                payment_method: paymentMethod
            };

            const response = await api.post('/orders', orderData);

            clearCart();

            alert(
                `✅ สั่งซื้อสำเร็จ!\n\n` +
                `เลขที่คำสั่งซื้อ: #${response.data.order_id}\n` +
                `ยอดรวม: ฿${Math.floor(finalTotal).toLocaleString()}\n\n` +
                `กรุณาชำระเงินภายใน 24 ชั่วโมง`
            );

            navigate('/orders');

        } catch (error) {
            console.error('Error creating order:', error);
            alert(
                '❌ เกิดข้อผิดพลาด\n\n' +
                'ไม่สามารถสร้างคำสั่งซื้อได้\n' +
                'กรุณาลองใหม่อีกครั้ง'
            );
        } finally {
            setLoading(false);
        }
    };

    if (cartItems.length === 0) {
        return (
            <div style={styles.emptyContainer}>
                <div style={styles.emptyContent}>
                    <div style={styles.emptyIcon}>🛒</div>
                    <h2 style={styles.emptyTitle}>ตะกร้าสินค้าว่างเปล่า</h2>
                    <p style={styles.emptyText}>กรุณาเลือกสินค้าก่อนชำระเงิน</p>
                    <button 
                        style={styles.shopButton}
                        onClick={() => navigate('/products')}
                    >
                        🛍️ เริ่มช้อปปิ้ง
                    </button>
                </div>
            </div>
        );
    }

    const shippingFee = 0;
    const totalWithShipping = getTotalWithPromotions() + shippingFee; // ✅ ใช้ราคาหลังหักโปรโมชั่น

    return (
        <div style={styles.container}>
            <h1 style={styles.title}>💳 ชำระเงิน</h1>

            <div style={styles.layout}>
                {/* ฟอร์มด้านซ้าย */}
                <div style={styles.formSection}>
                    <form onSubmit={handleSubmitOrder}>
                        {/* ข้อมูลการจัดส่ง */}
                        <div style={styles.section}>
                            <div style={styles.sectionHeader}>
                                <h2 style={styles.sectionTitle}>📦 ข้อมูลการจัดส่ง</h2>
                            </div>
                            
                            <div style={styles.formGroup}>
                                <label style={styles.label}>ชื่อ-นามสกุล *</label>
                                <input
                                    type="text"
                                    name="fullName"
                                    value={shippingInfo.fullName}
                                    onChange={handleInputChange}
                                    style={styles.input}
                                    placeholder="ชื่อ นามสกุล"
                                    required
                                />
                            </div>

                            <div style={styles.formGroup}>
                                <label style={styles.label}>เบอร์โทรศัพท์ *</label>
                                <input
                                    type="tel"
                                    name="phone"
                                    value={shippingInfo.phone}
                                    onChange={handleInputChange}
                                    style={styles.input}
                                    placeholder="08X-XXX-XXXX"
                                    maxLength="10"
                                    required
                                />
                            </div>

                            <div style={styles.formGroup}>
                                <label style={styles.label}>ที่อยู่ *</label>
                                <textarea
                                    name="address"
                                    value={shippingInfo.address}
                                    onChange={handleInputChange}
                                    style={styles.textarea}
                                    placeholder="บ้านเลขที่ ถนน"
                                    rows="3"
                                    required
                                />
                            </div>

                            <div style={styles.formRow}>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>อำเภอ/เขต *</label>
                                    <input
                                        type="text"
                                        name="district"
                                        value={shippingInfo.district}
                                        onChange={handleInputChange}
                                        style={styles.input}
                                        placeholder="อำเภอ/เขต"
                                        required
                                    />
                                </div>

                                <div style={styles.formGroup}>
                                    <label style={styles.label}>จังหวัด *</label>
                                    <input
                                        type="text"
                                        name="province"
                                        value={shippingInfo.province}
                                        onChange={handleInputChange}
                                        style={styles.input}
                                        placeholder="จังหวัด"
                                        required
                                    />
                                </div>
                            </div>

                            <div style={styles.formGroup}>
                                <label style={styles.label}>รหัสไปรษณีย์ *</label>
                                <input
                                    type="text"
                                    name="postalCode"
                                    value={shippingInfo.postalCode}
                                    onChange={handleInputChange}
                                    style={styles.input}
                                    placeholder="10XXX"
                                    maxLength="5"
                                    required
                                />
                            </div>

                            {(!user?.name || !user?.phone || !user?.address) && (
                                <div style={styles.profileHint}>
                                    <p style={styles.hintText}>
                                        💡 คุณสามารถบันทึกข้อมูลไว้ใน <button 
                                            type="button"
                                            style={styles.profileLink}
                                            onClick={() => navigate('/profile')}
                                        >
                                            โปรไฟล์
                                        </button> เพื่อไม่ต้องกรอกซ้ำ
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* วิธีการชำระเงิน */}
                        <div style={styles.section}>
                            <h2 style={styles.sectionTitle}>💰 วิธีการชำระเงิน</h2>
                            
                            <div style={styles.paymentOptions}>
                                <label style={styles.paymentOption}>
                                    <input
                                        type="radio"
                                        name="payment"
                                        value="promptpay"
                                        checked={paymentMethod === 'promptpay'}
                                        onChange={(e) => setPaymentMethod(e.target.value)}
                                    />
                                    <span style={styles.paymentLabel}>
                                        <span style={styles.paymentIcon}>💳</span>
                                        พร้อมเพย์ (PromptPay)
                                    </span>
                                </label>

                                <label style={styles.paymentOption}>
                                    <input
                                        type="radio"
                                        name="payment"
                                        value="transfer"
                                        checked={paymentMethod === 'transfer'}
                                        onChange={(e) => setPaymentMethod(e.target.value)}
                                    />
                                    <span style={styles.paymentLabel}>
                                        <span style={styles.paymentIcon}>🏦</span>
                                        โอนเงินผ่านธนาคาร
                                    </span>
                                </label>

                                <label style={styles.paymentOption}>
                                    <input
                                        type="radio"
                                        name="payment"
                                        value="cod"
                                        checked={paymentMethod === 'cod'}
                                        onChange={(e) => setPaymentMethod(e.target.value)}
                                    />
                                    <span style={styles.paymentLabel}>
                                        <span style={styles.paymentIcon}>💵</span>
                                        เก็บเงินปลายทาง (COD)
                                    </span>
                                </label>
                            </div>
                        </div>

                        <div style={styles.formActions}>
                            <button
                                type="button"
                                style={styles.backButton}
                                onClick={() => navigate('/cart')}
                            >
                                ← กลับไปตะกร้า
                            </button>
                            <button
                                type="submit"
                                style={styles.submitButton}
                                disabled={loading}
                            >
                                {loading ? '⏳ กำลังดำเนินการ...' : '✓ ยืนยันคำสั่งซื้อ'}
                            </button>
                        </div>
                    </form>
                </div>

                {/* สรุปคำสั่งซื้อด้านขวา */}
                <div style={styles.summarySection}>
                    <div style={styles.summaryCard}>
                        <h2 style={styles.sectionTitle}>📋 สรุปคำสั่งซื้อ</h2>
                        
                        {/* รายการสินค้า */}
                        <div style={styles.itemsList}>
                            {cartItems.map((item) => {
                                // ✅ คำนวณราคาโปรโมชั่น
                                const promo = getProductPromotion(item.product_id);
                                const discountedPrice = calculateDiscountedPrice(item);
                                const hasDiscount = promo && discountedPrice < item.price;

                                return (
                                    <div key={item.product_id} style={styles.summaryItem}>
                                        <div style={styles.itemImageContainer}>
                                            <img 
                                                src={item.image_url || 'https://placehold.co/60x60/ccc/666?text=No+Image'}
                                                alt={item.name}
                                                style={styles.summaryImage}
                                                onError={(e) => {
                                                    e.target.src = 'https://placehold.co/60x60/ccc/666?text=No+Image';
                                                }}
                                            />
                                            {/* ✅ Badge โปรโมชั่น */}
                                            {hasDiscount && (
                                                <div style={styles.itemPromoBadge}>
                                                    {promo.discount_type === 'percent' 
                                                        ? `-${promo.discount_value || promo.discount_percentage}%`
                                                        : `-฿${promo.discount_value}`
                                                    }
                                                </div>
                                            )}
                                        </div>
                                        
                                        <div style={styles.summaryItemInfo}>
                                            <p style={styles.summaryItemName}>{item.name}</p>
                                            <p style={styles.summaryItemQty}>จำนวน: {item.quantity}</p>
                                            {/* ✅ แสดงราคาเต็มถ้ามีส่วนลด */}
                                            {hasDiscount && (
                                                <p style={styles.itemOriginalPrice}>
                                                    ฿{Number(item.price).toLocaleString()} / ชิ้น
                                                </p>
                                            )}
                                        </div>
                                        
                                        <div style={styles.priceColumn}>
                                            <p style={styles.summaryItemPrice}>
                                                ฿{Math.floor(discountedPrice * item.quantity).toLocaleString()}
                                            </p>
                                            {hasDiscount && (
                                                <p style={styles.itemSaved}>
                                                    ประหยัด ฿{Math.floor((item.price - discountedPrice) * item.quantity).toLocaleString()}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* สรุปราคา */}
                        <div style={styles.priceBreakdown}>
                            {/* ✅ แสดงราคาเต็มถ้ามีส่วนลด */}
                            {getTotalDiscount() > 0 && (
                                <>
                                    <div style={styles.priceRow}>
                                        <span>ยอดรวมสินค้า (ราคาเต็ม):</span>
                                        <span style={styles.strikethrough}>
                                            ฿{getTotalPrice().toLocaleString()}
                                        </span>
                                    </div>
                                    <div style={styles.discountRow}>
                                        <span>ส่วนลดรวม:</span>
                                        <span style={styles.discountAmount}>
                                            -฿{Math.floor(getTotalDiscount()).toLocaleString()}
                                        </span>
                                    </div>
                                </>
                            )}
                            
                            <div style={styles.priceRow}>
                                <span>ยอดรวมสินค้า{getTotalDiscount() > 0 ? ' (หลังส่วนลด)' : ''}:</span>
                                <span>฿{Math.floor(getTotalWithPromotions()).toLocaleString()}</span>
                            </div>
                            
                            <div style={styles.priceRow}>
                                <span>ค่าจัดส่ง:</span>
                                <span>฿{shippingFee.toLocaleString()}</span>
                            </div>
                            
                            <div style={styles.divider}></div>
                            
                            <div style={styles.totalRow}>
                                <span>ยอดรวมทั้งหมด:</span>
                                <span style={styles.totalPrice}>
                                    ฿{Math.floor(totalWithShipping).toLocaleString()}
                                </span>
                            </div>

                            {/* ✅ แสดงยอดที่ประหยัดได้ */}
                            {getTotalDiscount() > 0 && (
                                <div style={styles.savingsBox}>
                                    🎉 คุณประหยัดไปทั้งหมด ฿{Math.floor(getTotalDiscount()).toLocaleString()}!
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const styles = {
    container: {
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '2rem 1rem',
        backgroundColor: '#f5f5f5',
        minHeight: '100vh',
    },
    title: {
        fontSize: '2rem',
        color: '#333',
        marginBottom: '2rem',
    },
    layout: {
        display: 'grid',
        gridTemplateColumns: '1fr 400px',
        gap: '2rem',
    },
    formSection: {
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem',
    },
    section: {
        backgroundColor: 'white',
        padding: '1.5rem',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    },
    sectionHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1.5rem',
    },
    sectionTitle: {
        fontSize: '1.3rem',
        margin: 0,
        color: '#333',
    },
    formGroup: {
        marginBottom: '1rem',
        flex: 1,
    },
    formRow: {
        display: 'flex',
        gap: '1rem',
    },
    label: {
        display: 'block',
        marginBottom: '0.5rem',
        fontWeight: 'bold',
        color: '#555',
        fontSize: '0.95rem',
    },
    input: {
        width: '100%',
        padding: '0.75rem',
        border: '1px solid #ddd',
        borderRadius: '4px',
        fontSize: '1rem',
        boxSizing: 'border-box',
    },
    textarea: {
        width: '100%',
        padding: '0.75rem',
        border: '1px solid #ddd',
        borderRadius: '4px',
        fontSize: '1rem',
        resize: 'vertical',
        fontFamily: 'inherit',
        boxSizing: 'border-box',
    },
    profileHint: {
        marginTop: '1rem',
        padding: '0.75rem',
        backgroundColor: '#fff3e0',
        borderRadius: '4px',
        borderLeft: '3px solid #ff9800',
    },
    hintText: {
        margin: 0,
        fontSize: '0.9rem',
        color: '#666',
    },
    profileLink: {
        background: 'none',
        border: 'none',
        color: '#ee4d2d',
        textDecoration: 'underline',
        cursor: 'pointer',
        padding: 0,
        fontSize: 'inherit',
        fontWeight: 'bold',
    },
    paymentOptions: {
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
    },
    paymentOption: {
        display: 'flex',
        alignItems: 'center',
        padding: '1rem',
        border: '2px solid #ddd',
        borderRadius: '8px',
        cursor: 'pointer',
        transition: 'all 0.2s',
    },
    paymentLabel: {
        marginLeft: '0.75rem',
        fontSize: '1rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
    },
    paymentIcon: {
        fontSize: '1.5rem',
    },
    formActions: {
        display: 'flex',
        gap: '1rem',
        marginTop: '1.5rem',
    },
    backButton: {
        flex: 1,
        padding: '1rem',
        backgroundColor: '#999',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '1rem',
        fontWeight: 'bold',
    },
    submitButton: {
        flex: 2,
        padding: '1rem',
        backgroundColor: '#ee4d2d',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '1rem',
        fontWeight: 'bold',
    },
    summarySection: {
        position: 'sticky',
        top: '2rem',
        height: 'fit-content',
    },
    summaryCard: {
        backgroundColor: 'white',
        padding: '1.5rem',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    },
    itemsList: {
        marginBottom: '1.5rem',
        maxHeight: '400px',
        overflowY: 'auto',
    },
    summaryItem: {
        display: 'flex',
        gap: '1rem',
        marginBottom: '1rem',
        paddingBottom: '1rem',
        borderBottom: '1px solid #f0f0f0',
        alignItems: 'flex-start',
    },
    // ✅ Container สำหรับรูป + badge
    itemImageContainer: {
        position: 'relative',
        flexShrink: 0,
    },
    summaryImage: {
        width: '60px',
        height: '60px',
        objectFit: 'cover',
        borderRadius: '4px',
    },
    // ✅ Badge โปรโมชั่นบนรูป
    itemPromoBadge: {
        position: 'absolute',
        top: '-6px',
        right: '-6px',
        backgroundColor: '#ff4757',
        color: 'white',
        padding: '3px 6px',
        borderRadius: '10px',
        fontSize: '0.7rem',
        fontWeight: 'bold',
        boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
    },
    summaryItemInfo: {
        flex: 1,
    },
    summaryItemName: {
        margin: '0 0 0.25rem 0',
        fontSize: '0.95rem',
        fontWeight: 'bold',
        color: '#333',
    },
    summaryItemQty: {
        margin: '0 0 0.25rem 0',
        fontSize: '0.85rem',
        color: '#666',
    },
    // ✅ ราคาเต็มขีดฆ่า
    itemOriginalPrice: {
        margin: 0,
        fontSize: '0.8rem',
        color: '#999',
        textDecoration: 'line-through',
    },
    // ✅ Column สำหรับราคา
    priceColumn: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: '0.25rem',
    },
    summaryItemPrice: {
        margin: 0,
        fontWeight: 'bold',
        color: '#ee4d2d',
        fontSize: '0.95rem',
    },
    // ✅ ยอดประหยัด
    itemSaved: {
        margin: 0,
        fontSize: '0.75rem',
        color: '#4CAF50',
        fontWeight: 'bold',
    },
    priceBreakdown: {
        borderTop: '1px solid #eee',
        paddingTop: '1rem',
    },
    priceRow: {
        display: 'flex',
        justifyContent: 'space-between',
        marginBottom: '0.75rem',
        fontSize: '0.95rem',
        color: '#666',
    },
    // ✅ ราคาขีดฆ่า
    strikethrough: {
        textDecoration: 'line-through',
        color: '#999',
    },
    // ✅ แถวส่วนลด
    discountRow: {
        display: 'flex',
        justifyContent: 'space-between',
        marginBottom: '0.75rem',
        fontSize: '0.95rem',
        color: '#4CAF50',
        fontWeight: '600',
    },
    discountAmount: {
        color: '#4CAF50',
        fontWeight: 'bold',
    },
    divider: {
        height: '1px',
        backgroundColor: '#eee',
        margin: '1rem 0',
    },
    totalRow: {
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: '1.1rem',
        fontWeight: 'bold',
        color: '#333',
    },
    totalPrice: {
        fontSize: '1.5rem',
        color: '#ee4d2d',
    },
    // ✅ กล่องแสดงยอดประหยัด
    savingsBox: {
        marginTop: '1rem',
        padding: '0.75rem',
        backgroundColor: '#e8f5e9',
        borderRadius: '6px',
        textAlign: 'center',
        color: '#2e7d32',
        fontWeight: 'bold',
        fontSize: '0.95rem',
    },
    emptyContainer: {
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f5f5f5',
    },
    emptyContent: {
        textAlign: 'center',
        padding: '3rem',
    },
    emptyIcon: {
        fontSize: '5rem',
        marginBottom: '1rem',
    },
    emptyTitle: {
        fontSize: '1.8rem',
        color: '#333',
        marginBottom: '0.5rem',
    },
    emptyText: {
        fontSize: '1.1rem',
        color: '#666',
        marginBottom: '2rem',
    },
    shopButton: {
        padding: '1rem 2rem',
        backgroundColor: '#ee4d2d',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '1.1rem',
        fontWeight: 'bold',
    },
};

export default CheckoutPage;