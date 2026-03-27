import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';

const CartPage = () => {
    const { 
        cartItems, 
        removeFromCart, 
        updateQuantity, 
        getTotalPrice,
        getTotalWithPromotions, // ✅ เพิ่ม
        getTotalDiscount, // ✅ เพิ่ม
        getProductPromotion, // ✅ เพิ่ม
        calculateDiscountedPrice, // ✅ เพิ่ม
        clearCart 
    } = useCart();
    
    const navigate = useNavigate();

    const handleUpdateQuantity = (productId, newQuantity) => {
        if (newQuantity < 1) {
            if (window.confirm('ต้องการลบสินค้านี้ออกจากตะกร้าหรือไม่?')) {
                removeFromCart(productId);
            }
            return;
        }
        updateQuantity(productId, newQuantity);
    };

    const handleRemove = (productId, productName) => {
        if (window.confirm(`ต้องการลบ "${productName}" ออกจากตะกร้าหรือไม่?`)) {
            removeFromCart(productId);
        }
    };

    const handleCheckout = () => {
        if (cartItems.length === 0) {
            alert('ตะกร้าสินค้าว่างเปล่า');
            return;
        }
        navigate('/checkout');
    };

    const handleClearCart = () => {
        if (window.confirm('ต้องการล้างตะกร้าสินค้าทั้งหมดหรือไม่?')) {
            clearCart();
        }
    };

    if (cartItems.length === 0) {
        return (
            <div style={styles.emptyContainer}>
                <div style={styles.emptyContent}>
                    <div style={styles.emptyIcon}>🛒</div>
                    <h2 style={styles.emptyTitle}>ตะกร้าสินค้าว่างเปล่า</h2>
                    <p style={styles.emptyText}>ยังไม่มีสินค้าในตะกร้า</p>
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

    return (
        <div style={styles.container}>
            {/* Header */}
            <div style={styles.header}>
                <h1 style={styles.title}>🛒 ตะกร้าสินค้า</h1>
                <button 
                    style={styles.clearButton}
                    onClick={handleClearCart}
                >
                    🗑️ ล้างตะกร้า
                </button>
            </div>

            {/* Cart Items */}
            <div style={styles.itemsList}>
                {cartItems.map((item) => {
                    // ✅ ดึงข้อมูลโปรโมชั่น
                    const promo = getProductPromotion(item.product_id);
                    const discountedPrice = calculateDiscountedPrice(item);
                    const hasDiscount = promo && discountedPrice < item.price;

                    return (
                        <div key={item.product_id} style={styles.cartItem}>
                            {/* ✅ Badge โปรโมชั่น */}
                            {hasDiscount && (
                                <div style={styles.promoBadge}>
                                    {promo.discount_type === 'percent' 
                                        ? `-${promo.discount_value || promo.discount_percentage}%`
                                        : `-฿${promo.discount_value}`
                                    }
                                </div>
                            )}

                            {/* Product Image */}
                            <img 
                                src={item.image_url || 'https://placehold.co/100x100/ccc/666?text=No+Image'} 
                                alt={item.name}
                                style={styles.image}
                                onError={(e) => {
                                    e.target.src = 'https://placehold.co/100x100/ccc/666?text=No+Image';
                                }}
                            />
                            
                            {/* Product Info */}
                            <div style={styles.itemInfo}>
                                <h3 style={styles.itemName}>{item.name}</h3>
                                
                                {/* ✅ แสดงราคาเต็ม + ราคาโปรโมชั่น */}
                                <div style={styles.priceContainer}>
                                    {hasDiscount ? (
                                        <>
                                            <p style={styles.originalPrice}>
                                                ฿{Number(item.price).toLocaleString()}
                                            </p>
                                            <p style={styles.discountedPrice}>
                                                ฿{Math.floor(discountedPrice).toLocaleString()} / ชิ้น
                                            </p>
                                        </>
                                    ) : (
                                        <p style={styles.itemPrice}>
                                            ฿{Number(item.price).toLocaleString()} / ชิ้น
                                        </p>
                                    )}
                                </div>

                                {item.description && (
                                    <p style={styles.itemDesc}>{item.description}</p>
                                )}
                            </div>

                            {/* Quantity Controls */}
                            <div style={styles.controls}>
                                <div style={styles.qtyContainer}>
                                    <button 
                                        style={styles.qtyBtn}
                                        onClick={() => handleUpdateQuantity(item.product_id, item.quantity - 1)}
                                    >
                                        −
                                    </button>
                                    <input 
                                        type="number" 
                                        value={item.quantity}
                                        onChange={(e) => {
                                            const val = parseInt(e.target.value) || 1;
                                            handleUpdateQuantity(item.product_id, val);
                                        }}
                                        style={styles.qtyInput}
                                        min="1"
                                    />
                                    <button 
                                        style={styles.qtyBtn}
                                        onClick={() => handleUpdateQuantity(item.product_id, item.quantity + 1)}
                                    >
                                        +
                                    </button>
                                </div>
                                
                                {/* ✅ Subtotal (รวมโปรโมชั่น) */}
                                <p style={styles.subtotal}>
                                    ฿{Math.floor(discountedPrice * item.quantity).toLocaleString()}
                                </p>

                                {/* Remove Button */}
                                <button 
                                    style={styles.removeBtn}
                                    onClick={() => handleRemove(item.product_id, item.name)}
                                >
                                    🗑️ ลบ
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Summary */}
            <div style={styles.summary}>
                <div style={styles.summaryRow}>
                    <span style={styles.summaryLabel}>จำนวนสินค้า:</span>
                    <span style={styles.summaryValue}>
                        {cartItems.reduce((sum, item) => sum + item.quantity, 0)} ชิ้น
                    </span>
                </div>

                {/* ✅ แสดงราคาเต็มก่อนลด (ถ้ามีส่วนลด) */}
                {getTotalDiscount() > 0 && (
                    <>
                        <div style={styles.summaryRow}>
                            <span style={styles.summaryLabel}>ยอดรวม (ราคาเต็ม):</span>
                            <span style={styles.originalTotalPrice}>
                                ฿{getTotalPrice().toLocaleString()}
                            </span>
                        </div>
                        <div style={styles.summaryRow}>
                            <span style={styles.discountLabel}>ส่วนลดทั้งหมด:</span>
                            <span style={styles.discountValue}>
                                -฿{Math.floor(getTotalDiscount()).toLocaleString()}
                            </span>
                        </div>
                    </>
                )}
                
                <div style={{...styles.summaryRow, ...styles.totalRow}}>
                    <span style={styles.summaryLabel}>ยอดรวมทั้งหมด:</span>
                    <span style={styles.totalAmount}>
                        ฿{Math.floor(getTotalWithPromotions()).toLocaleString()}
                    </span>
                </div>

                <div style={styles.actions}>
                    <button 
                        style={styles.continueBtn}
                        onClick={() => navigate('/products')}
                    >
                        ← ช้อปปิ้งต่อ
                    </button>
                    <button 
                        style={styles.checkoutBtn}
                        onClick={handleCheckout}
                    >
                        ชำระเงิน →
                    </button>
                </div>
            </div>
        </div>
    );
};

const styles = {
    container: {
        maxWidth: '1000px',
        margin: '0 auto',
        padding: '2rem 1rem',
        backgroundColor: '#f5f5f5',
        minHeight: '100vh',
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '2rem',
    },
    title: {
        fontSize: '2rem',
        color: '#333',
        margin: 0,
    },
    clearButton: {
        backgroundColor: '#999',
        color: 'white',
        border: 'none',
        padding: '0.6rem 1.2rem',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '0.9rem',
        fontWeight: 'bold',
        transition: 'background-color 0.2s',
    },
    itemsList: {
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        marginBottom: '2rem',
    },
    cartItem: {
        position: 'relative', // ✅ สำหรับ badge
        display: 'flex',
        gap: '1rem',
        backgroundColor: 'white',
        padding: '1.5rem',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        alignItems: 'flex-start',
    },
    // ✅ Badge โปรโมชั่น
    promoBadge: {
        position: 'absolute',
        top: '12px',
        right: '12px',
        backgroundColor: '#ff4757',
        color: 'white',
        padding: '6px 12px',
        borderRadius: '20px',
        fontSize: '0.85rem',
        fontWeight: 'bold',
        zIndex: 2,
        boxShadow: '0 2px 8px rgba(255,71,87,0.4)',
    },
    image: {
        width: '100px',
        height: '100px',
        objectFit: 'cover',
        borderRadius: '4px',
        flexShrink: 0,
    },
    itemInfo: {
        flex: 1,
    },
    itemName: {
        margin: '0 0 0.5rem 0',
        fontSize: '1.1rem',
        fontWeight: 'bold',
        color: '#333',
    },
    // ✅ Container สำหรับราคา
    priceContainer: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        marginBottom: '0.5rem',
    },
    itemPrice: {
        margin: 0,
        fontSize: '0.95rem',
        color: '#666',
        fontWeight: 'bold',
    },
    // ✅ ราคาเต็มขีดฆ่า
    originalPrice: {
        margin: 0,
        fontSize: '0.9rem',
        color: '#999',
        textDecoration: 'line-through',
    },
    // ✅ ราคาโปรโมชั่น
    discountedPrice: {
        margin: 0,
        fontSize: '1.05rem',
        color: '#ee4d2d',
        fontWeight: 'bold',
    },
    itemDesc: {
        margin: 0,
        fontSize: '0.85rem',
        color: '#999',
    },
    controls: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: '0.75rem',
    },
    qtyContainer: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
    },
    qtyBtn: {
        width: '32px',
        height: '32px',
        border: '1px solid #ddd',
        borderRadius: '4px',
        backgroundColor: 'white',
        cursor: 'pointer',
        fontSize: '1.2rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    qtyInput: {
        width: '50px',
        height: '32px',
        textAlign: 'center',
        border: '1px solid #ddd',
        borderRadius: '4px',
        fontSize: '1rem',
    },
    subtotal: {
        fontSize: '1.2rem',
        fontWeight: 'bold',
        color: '#ee4d2d',
        margin: 0,
    },
    removeBtn: {
        backgroundColor: '#f44336',
        color: 'white',
        border: 'none',
        padding: '0.5rem 1rem',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '0.85rem',
        fontWeight: 'bold',
    },
    summary: {
        backgroundColor: 'white',
        padding: '1.5rem',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    },
    summaryRow: {
        display: 'flex',
        justifyContent: 'space-between',
        marginBottom: '1rem',
        fontSize: '1rem',
    },
    summaryLabel: {
        color: '#666',
    },
    summaryValue: {
        fontWeight: 'bold',
        color: '#333',
    },
    // ✅ ราคาเต็มในสรุป
    originalTotalPrice: {
        fontWeight: 'bold',
        color: '#999',
        textDecoration: 'line-through',
    },
    // ✅ ส่วนลด
    discountLabel: {
        color: '#4CAF50',
        fontWeight: '600',
    },
    discountValue: {
        color: '#4CAF50',
        fontWeight: 'bold',
        fontSize: '1.1rem',
    },
    // ✅ แถวยอดรวมสุดท้าย
    totalRow: {
        borderTop: '2px solid #eee',
        paddingTop: '1rem',
        marginTop: '0.5rem',
    },
    totalAmount: {
        fontSize: '1.5rem',
        fontWeight: 'bold',
        color: '#ee4d2d',
    },
    actions: {
        display: 'flex',
        gap: '1rem',
        marginTop: '1.5rem',
    },
    continueBtn: {
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
    checkoutBtn: {
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

export default CartPage;