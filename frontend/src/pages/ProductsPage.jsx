import { useState, useEffect } from 'react';
import { useCart } from '../context/CartContext';

const API_BASE = `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api`;



const ProductsPage = () => {
    const [products, setProducts] = useState([]);
    const [promotions, setPromotions] = useState([]);
    const [quantities, setQuantities] = useState({});
    const { addToCart } = useCart();

    useEffect(() => {
        const fetchProducts = async () => {
            try {
                const res = await fetch(`${API_BASE}/products`);
                if (res.ok) {
                    const data = await res.json();
                    setProducts(Array.isArray(data) ? data : []);
                    
                    const initialQuantities = {};
                    data.forEach(product => {
                        initialQuantities[product.product_id] = 1;
                    });
                    setQuantities(initialQuantities);
                } else {
                    console.error('Failed to fetch products:', res.status);
                    setProducts([]);
                }
            } catch (err) {
                console.error('Error fetching products:', err);
                setProducts([]);
            }
        };

        const fetchPromotions = async () => {
            try {
                const res = await fetch(`${API_BASE}/promotions`);
                if (res.ok) {
                    const data = await res.json();
                    setPromotions(Array.isArray(data) ? data : []);
                }
            } catch (err) {
                console.error('Error fetching promotions:', err);
                setPromotions([]);
            }
        };

        fetchProducts();
        fetchPromotions();
    }, []);

    const getProductPromotion = (productId) => {
        const promo = promotions.find(p => p.product_id === productId);
        
        if (!promo) return null;
        
        const now = new Date();
        const start = promo.start_date ? new Date(promo.start_date) : null;
        const end = promo.end_date ? new Date(promo.end_date) : null;
        
        if (!start && !end) return promo;
        
        const isActive = (!start || now >= start) && (!end || now <= end);
        
        return isActive ? promo : null;
    };

    const calculateDiscountedPrice = (product) => {
        const promo = getProductPromotion(product.product_id);
        if (!promo) return product.price;

        const discount = parseFloat(promo.discount_value || promo.discount_percentage || 0);
        if (promo.discount_type === 'percent') {
            return product.price * (1 - discount / 100);
        } else {
            return product.price - discount;
        }
    };

    const increaseQty = (productId, stock) => {
        setQuantities(prev => ({
            ...prev,
            [productId]: Math.min((prev[productId] || 1) + 1, stock)
        }));
    };

    const decreaseQty = (productId) => {
        setQuantities(prev => ({
            ...prev,
            [productId]: Math.max((prev[productId] || 1) - 1, 1)
        }));
    };

    const handleAddToCart = (product) => {
        const quantity = quantities[product.product_id] || 1;
        addToCart(product, quantity);
        alert(`✅ เพิ่ม ${product.name} จำนวน ${quantity} ชิ้น ลงตะกร้าแล้ว!`);
    };

    return (
        <div style={styles.container}>
            <div style={styles.searchBox}>
                <input 
                    type="text" 
                    placeholder="🔍 ค้นหาในร้านค้า" 
                    style={styles.searchInput}
                />
            </div>

            <div style={styles.toolbar}>
                <span style={styles.count}>{products.length} สินค้า</span>
            </div>

            <div style={styles.grid}>
                {products.map((product) => {
                    const promo = getProductPromotion(product.product_id);
                    const discountedPrice = calculateDiscountedPrice(product);
                    const hasDiscount = promo && discountedPrice < product.price;

                    return (
                        <div key={product.product_id} style={styles.card}>
                            {hasDiscount && (
                                <div style={styles.discountBadge}>
                                    -{promo.discount_value || promo.discount_percentage}%
                                </div>
                            )}

                            {/* รูปภาพแบบเต็มพื้นที่ */}
<div style={styles.imageContainer}>
    <img 
        src={
  !product.image_url
    ? 'https://placehold.co/400x400/ccc/666?text=No+Image'
    : product.image_url.startsWith('http')
      ? product.image_url
      : `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}${product.image_url}` // ✅ ไม่มี /public ไม่มี /images/products
}
        alt={product.name}
        style={styles.image}
        onError={(e) => {
            e.target.src = 'https://placehold.co/400x400/ccc/666?text=No+Image';
        }}
    />
</div>

                            <div style={styles.cardContent}>
                                <h3 style={styles.productName}>{product.name}</h3>
                                
                                {/* ข้อมูลเพิ่มเติม */}
                                <div style={styles.infoSection}>
                                    {product.country && (
                                        <div style={styles.infoItem}>
                                            <span style={styles.infoIcon}>From : </span>
                                            <span style={styles.infoText}>{product.country}</span>
                                        </div>
                                    )}
                                    {product.size && (
                                        <div style={styles.infoItem}>
                                            <span style={styles.infoIcon}>📏</span>
                                            <span style={styles.infoText}>{product.size}</span>
                                        </div>
                                    )}
                                    {product.weight && (
                                        <div style={styles.infoItem}>
                                            <span style={styles.infoIcon}>Size : </span>
                                            <span style={styles.infoText}>
                                                {product.weight} {product.weight_unit || 'kg'}
                                            </span>
                                        </div>
                                    )}
                                    {product.qr_code && (
                                        <div style={styles.qrCodeContainer}>
                                            <img 
                                                src={`https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent(product.qr_code)}`}
                                                alt="QR Code"
                                                style={styles.qrCodeImage}
                                            />
                                            <span style={styles.qrCodeText}>{product.qr_code}</span>
                                        </div>
                                    )}
                                </div>

                                <div style={styles.priceRow}>
                                    <div style={styles.priceContainer}>
                                        {hasDiscount ? (
                                            <>
                                                <span style={styles.originalPrice}>
                                                    ฿{Number(product.price).toLocaleString('th-TH')}
                                                </span>
                                                <span style={styles.price}>
                                                    ฿{Math.floor(discountedPrice).toLocaleString('th-TH')}
                                                </span>
                                            </>
                                        ) : (
                                            <span style={styles.price}>
                                                ฿{Number(product.price).toLocaleString('th-TH')}
                                            </span>
                                        )}
                                    </div>
                                    <span style={styles.stock}>เหลือ {product.stock}</span>
                                </div>
                                
                                <div style={styles.qtyContainer}>
                                    <button 
                                        style={styles.qtyBtn} 
                                        onClick={() => decreaseQty(product.product_id)}
                                    >
                                        −
                                    </button>
                                    <span style={styles.qtyText}>{quantities[product.product_id] || 1}</span>
                                    <button 
                                        style={styles.qtyBtn} 
                                        onClick={() => increaseQty(product.product_id, product.stock)}
                                    >
                                        +
                                    </button>
                                </div>

                                <button 
                                    style={styles.btn}
                                    onClick={() => handleAddToCart(product)}
                                >
                                    🛒 เพิ่มลงตะกร้า
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

const styles = {
    container: {
        minHeight: '100vh',
        backgroundColor: '#f5f5f5',
    },
    searchBox: {
        padding: '1rem',
        backgroundColor: 'white',
        borderBottom: '1px solid #eee',
    },
    searchInput: {
        width: '100%',
        padding: '0.75rem 1rem',
        fontSize: '1rem',
        border: '2px solid #ee4d2d',
        borderRadius: '25px',
        outline: 'none',
        boxSizing: 'border-box',
    },
    toolbar: {
        padding: '1rem',
        backgroundColor: 'white',
        borderBottom: '1px solid #eee',
    },
    count: {
        fontSize: '0.9rem',
        color: '#666',
        fontWeight: 'bold',
    },
    grid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
        gap: '1rem',
        padding: '1rem',
    },
    card: {
        backgroundColor: 'white',
        borderRadius: '12px',
        overflow: 'hidden',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        position: 'relative',
        transition: 'transform 0.2s, box-shadow 0.2s',
        cursor: 'pointer',
    },
    discountBadge: {
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
    imageContainer: {
        width: '100%',
        paddingTop: '100%', // สร้าง aspect ratio 1:1 (จตุรัส)
        position: 'relative',
        backgroundColor: '#f8f9fa',
        overflow: 'hidden',
    },
    image: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        objectFit: 'cover', // แสดงรูปเต็มพื้นที่โดยครอบตัดส่วนที่เกิน
        backgroundColor: 'white',
    },
    cardContent: {
        padding: '1rem',
    },
    productName: {
        fontSize: '1rem',
        margin: '0 0 0.75rem 0',
        height: '2.8em',
        overflow: 'hidden',
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
        fontWeight: 'bold',
        color: '#333',
        lineHeight: '1.4',
    },
    infoSection: {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        marginBottom: '1rem',
        padding: '0.75rem',
        backgroundColor: '#f8f9fa',
        borderRadius: '8px',
        border: '1px solid #e9ecef',
    },
    infoItem: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
    },
    infoIcon: {
        fontSize: '1rem',
        minWidth: '20px',
    },
    infoText: {
        fontSize: '0.85rem',
        color: '#495057',
        fontWeight: '500',
    },
    qrCodeContainer: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '6px',
        marginTop: '8px',
        padding: '8px',
        backgroundColor: 'white',
        borderRadius: '8px',
        border: '1px solid #dee2e6',
    },
    qrCodeImage: {
        width: '80px',
        height: '80px',
        border: '2px solid #ddd',
        borderRadius: '6px',
        padding: '4px',
        backgroundColor: 'white',
    },
    qrCodeText: {
        fontSize: '0.7rem',
        color: '#6c757d',
        fontFamily: 'monospace',
        textAlign: 'center',
        wordBreak: 'break-all',
    },
    priceRow: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        marginBottom: '0.75rem',
        minHeight: '52px',
    },
    priceContainer: {
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        gap: '4px',
    },
    originalPrice: {
        fontSize: '0.8rem',
        color: '#999',
        textDecoration: 'line-through',
    },
    price: {
        fontSize: '1.25rem',
        fontWeight: 'bold',
        color: '#ee4d2d',
    },
    stock: {
        fontSize: '0.8rem',
        color: '#888',
        fontWeight: '500',
    },
    qtyContainer: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '1rem',
        marginBottom: '0.75rem',
        padding: '0.5rem 0',
    },
    qtyBtn: {
        width: '32px',
        height: '32px',
        border: '2px solid #ee4d2d',
        borderRadius: '6px',
        backgroundColor: 'white',
        color: '#ee4d2d',
        cursor: 'pointer',
        fontSize: '1.3rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.2s',
        fontWeight: 'bold',
    },
    qtyText: {
        fontSize: '1.1rem',
        fontWeight: 'bold',
        minWidth: '35px',
        textAlign: 'center',
        color: '#333',
    },
    btn: {
        width: '100%',
        backgroundColor: '#ee4d2d',
        color: 'white',
        border: 'none',
        padding: '0.75rem',
        borderRadius: '8px',
        cursor: 'pointer',
        fontSize: '0.95rem',
        fontWeight: 'bold',
        transition: 'all 0.2s',
        boxShadow: '0 2px 4px rgba(238,77,45,0.3)',
    },
};

export default ProductsPage;