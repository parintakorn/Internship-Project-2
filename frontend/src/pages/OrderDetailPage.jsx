import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';

const OrderDetailPage = () => {
    const { orderId } = useParams();
    const navigate = useNavigate();
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchOrderDetail();
    }, [orderId]);

    const fetchOrderDetail = async () => {
        try {
            const response = await api.get(`/orders/${orderId}`);
            setOrder(response.data.order);

            console.log('📦 Order Detail Full Data:', response.data.order);
        console.log('📍 Shipping Address:', response.data.order.shipping_address);
            console.log('📦 Order Detail:', response.data.order);
        } catch (error) {
            console.error('Error fetching order detail:', error);
            alert('ไม่พบคำสั่งซื้อ');
            navigate('/orders');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div style={styles.loadingContainer}>
                <div style={styles.spinner}>⏳</div>
                <p>กำลังโหลด...</p>
            </div>
        );
    }

    if (!order) {
        return (
            <div style={styles.errorContainer}>
                <h2>❌ ไม่พบคำสั่งซื้อ</h2>
                <button onClick={() => navigate('/orders')} style={styles.backButton}>
                    กลับหน้ารายการ
                </button>
            </div>
        );
    }

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <button onClick={() => navigate('/orders')} style={styles.backBtn}>
                    ← กลับ
                </button>
                <h1 style={styles.title}>รายละเอียดคำสั่งซื้อ</h1>
            </div>

            {/* Order Info Card */}
            <div style={styles.card}>
                <div style={styles.cardHeader}>
                    <h2 style={styles.orderId}>คำสั่งซื้อ #{order.order_id}</h2>
                    {getStatusBadge(order.status)}
                </div>

                <div style={styles.infoSection}>
                    <div style={styles.infoRow}>
                        <span>วันที่สั่งซื้อ:</span>
                        <strong>
                            {new Date(order.created_at).toLocaleDateString('th-TH', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                            })}
                        </strong>
                    </div>
                    <div style={styles.infoRow}>
                        <span>วิธีชำระเงิน:</span>
                        <strong>{getPaymentMethodText(order.payment_method)}</strong>
                    </div>
                    <div style={styles.infoRow}>
                        <span>สถานะ:</span>
                        <strong>{getStatusText(order.status)}</strong>
                    </div>
                </div>
            </div>

            {/* Order Items */}
            <div style={styles.card}>
                <h3 style={styles.sectionTitle}>รายการสินค้า</h3>
                <div style={styles.itemsList}>
                    {order.items && order.items.map((item, index) => (
                        <div key={index} style={styles.orderItem}>
                            <div style={styles.itemInfo}>
                                <img 
                                    src={item.image_url || '/placeholder.png'} 
                                    alt={item.product_name}
                                    style={styles.itemImage}
                                />
                                <div>
                                    <div style={styles.itemName}>{item.product_name}</div>
                                    <div style={styles.itemPrice}>
                                        ฿{item.price.toLocaleString()} x {item.quantity}
                                    </div>
                                </div>
                            </div>
                            <div style={styles.itemTotal}>
                                ฿{(item.price * item.quantity).toLocaleString()}
                            </div>
                        </div>
                    ))}
                </div>

                <div style={styles.summary}>
                    <div style={styles.summaryRow}>
                        <span>ยอดรวมสินค้า:</span>
                        <span>฿{Math.floor(order.total_price).toLocaleString()}</span>
                    </div>
                    <div style={styles.summaryRow}>
                        <span>ค่าจัดส่ง:</span>
                        <span>฿0</span>
                    </div>
                    <div style={{...styles.summaryRow, ...styles.totalRow}}>
                        <strong>ยอดรวมทั้งหมด:</strong>
                        <strong style={styles.totalPrice}>
                            ฿{Math.floor(order.total_price).toLocaleString()}
                        </strong>
                    </div>
                </div>
            </div>

            {/* Shipping Address */}
<div style={styles.card}>
    <h3 style={styles.sectionTitle}>📍 ข้อมูลผู้รับสินค้า</h3>
    <div style={styles.addressBox}>
        {/* ✅ แสดงชื่อ - ลองจาก shipping_address ก่อน ถ้าไม่มีใช้ customer_name */}
        {(order.shipping_address?.full_name || order.customer_name) && (
            <p style={{ margin: '0 0 0.5rem 0' }}>
                <strong>{order.shipping_address?.full_name || order.customer_name}</strong>
            </p>
        )}
        
        {/* ✅ แสดงเบอร์โทร */}
        {(order.shipping_address?.phone || order.customer_phone) && (
            <p style={{ margin: '0 0 0.5rem 0' }}>
                📱 {order.shipping_address?.phone || order.customer_phone}
            </p>
        )}
        
        {/* ✅ แสดงอีเมล */}
        {order.customer_email && (
            <p style={{ margin: '0 0 0.5rem 0' }}>
                📧 {order.customer_email}
            </p>
        )}
        
        {/* ✅ แสดงที่อยู่แบบละเอียด */}
        {order.shipping_address && typeof order.shipping_address === 'object' && (
            <>
                {order.shipping_address.full_address && (
                    <p style={{ margin: '0 0 0.5rem 0' }}>
                        🏠 {order.shipping_address.full_address}
                    </p>
                )}
                
                {/* แสดง เขต/อำเภอ จังหวัด รหัสไปรษณีย์ */}
                {(order.shipping_address.district || order.shipping_address.province || order.shipping_address.postal_code) && (
                    <p style={{ margin: '0 0 0.5rem 0' }}>
                        📍 {[
                            order.shipping_address.district,
                            order.shipping_address.province,
                            order.shipping_address.postal_code
                        ].filter(Boolean).join(' ')}
                    </p>
                )}
            </>
        )}
        
        {/* ✅ กรณีที่ shipping_address เป็น string (ข้อมูลเก่า) */}
        {order.shipping_address && typeof order.shipping_address === 'string' && (
            <p style={{ margin: '0 0 0.5rem 0' }}>
                📍 {order.shipping_address}
            </p>
        )}
        
        {/* ถ้าไม่มีข้อมูลเลย */}
        {!order.customer_name && !order.customer_phone && !order.customer_email && !order.shipping_address && (
            <p style={styles.noAddress}>ไม่มีข้อมูลที่อยู่</p>
        )}
    </div>
</div>

            {/* Action Buttons */}
            <div style={styles.actions}>
                {order.status === 'pending' && (
                    <button 
                        onClick={() => navigate(`/payment/${order.order_id}`)}
                        style={styles.payButton}
                    >
                        💳 ชำระเงิน
                    </button>
                )}
                <button 
                    onClick={() => navigate('/orders')}
                    style={styles.backToListButton}
                >
                    📋 กลับหน้ารายการคำสั่งซื้อ
                </button>
            </div>
        </div>
    );
};

const getStatusBadge = (status) => {
    const statusMap = {
        'pending': { label: '⏳ รอชำระเงิน', color: '#ff9800' },
        'paid': { label: '✅ ชำระแล้ว', color: '#4caf50' },
        'shipped': { label: '🚚 จัดส่งแล้ว', color: '#2196f3' },
        'completed': { label: '✔️ สำเร็จ', color: '#26a69a' },
        'cancelled': { label: '❌ ยกเลิก', color: '#f44336' }
    };
    const config = statusMap[status] || statusMap.pending;
    
    return (
        <span style={{
            padding: '0.5rem 1rem',
            borderRadius: '20px',
            fontSize: '0.9rem',
            fontWeight: '600',
            backgroundColor: config.color + '20',
            color: config.color,
            border: `1px solid ${config.color}`
        }}>
            {config.label}
        </span>
    );
};

const getPaymentMethodText = (method) => {
    const methodMap = {
        'promptpay': '💳 พร้อมเพย์',
        'transfer': '🏦 โอนเงิน',
        'cod': '💵 เก็บเงินปลายทาง'
    };
    return methodMap[method] || method;
};

const getStatusText = (status) => {
    const statusMap = {
        'pending': 'รอชำระเงิน',
        'paid': 'ชำระแล้ว',
        'shipped': 'จัดส่งแล้ว',
        'completed': 'สำเร็จ',
        'cancelled': 'ยกเลิก'
    };
    return statusMap[status] || status;
};

const styles = {
    container: {
        maxWidth: '900px',
        margin: '0 auto',
        padding: '2rem 1rem',
        backgroundColor: '#f5f5f5',
        minHeight: '100vh',
    },
    header: {
        marginBottom: '2rem',
    },
    backBtn: {
        backgroundColor: 'transparent',
        border: 'none',
        color: '#007bff',
        fontSize: '1rem',
        cursor: 'pointer',
        marginBottom: '1rem',
        padding: '0.5rem 0',
    },
    title: {
        fontSize: '2rem',
        color: '#333',
        margin: 0,
    },
    card: {
        backgroundColor: 'white',
        borderRadius: '8px',
        padding: '2rem',
        marginBottom: '1.5rem',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    },
    cardHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1.5rem',
        paddingBottom: '1rem',
        borderBottom: '2px solid #f0f0f0',
    },
    orderId: {
        fontSize: '1.5rem',
        margin: 0,
        color: '#333',
    },
    infoSection: {
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
    },
    infoRow: {
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: '1rem',
    },
    sectionTitle: {
        fontSize: '1.3rem',
        marginBottom: '1.5rem',
        color: '#333',
    },
    itemsList: {
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        marginBottom: '1.5rem',
    },
    orderItem: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '1rem',
        backgroundColor: '#f8f9fa',
        borderRadius: '6px',
    },
    itemInfo: {
        display: 'flex',
        gap: '1rem',
        alignItems: 'center',
    },
    itemImage: {
        width: '60px',
        height: '60px',
        objectFit: 'cover',
        borderRadius: '6px',
    },
    itemName: {
        fontSize: '1rem',
        fontWeight: '600',
        marginBottom: '0.25rem',
    },
    itemPrice: {
        fontSize: '0.9rem',
        color: '#666',
    },
    itemTotal: {
        fontSize: '1.1rem',
        fontWeight: 'bold',
        color: '#333',
    },
    summary: {
        borderTop: '2px solid #e0e0e0',
        paddingTop: '1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
    },
    summaryRow: {
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: '1rem',
    },
    totalRow: {
        marginTop: '0.5rem',
        paddingTop: '0.75rem',
        borderTop: '1px solid #e0e0e0',
    },
    totalPrice: {
        fontSize: '1.5rem',
        color: '#ee4d2d',
    },
    addressBox: {
        backgroundColor: '#f8f9fa',
        padding: '1.5rem',
        borderRadius: '6px',
        lineHeight: '1.8',
    },
    actions: {
        display: 'flex',
        gap: '1rem',
        flexWrap: 'wrap',
    },
    payButton: {
        flex: 1,
        minWidth: '200px',
        padding: '1rem 2rem',
        backgroundColor: '#4CAF50',
        color: 'white',
        border: 'none',
        borderRadius: '6px',
        cursor: 'pointer',
        fontSize: '1.1rem',
        fontWeight: 'bold',
    },
    backToListButton: {
        flex: 1,
        minWidth: '200px',
        padding: '1rem 2rem',
        backgroundColor: '#2196f3',
        color: 'white',
        border: 'none',
        borderRadius: '6px',
        cursor: 'pointer',
        fontSize: '1.1rem',
        fontWeight: 'bold',
    },
    loadingContainer: {
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f5f5f5',
    },
    spinner: {
        fontSize: '3rem',
    },
    errorContainer: {
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f5f5f5',
    },
    backButton: {
        marginTop: '2rem',
        padding: '1rem 2rem',
        backgroundColor: '#007bff',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
    },
    addressBox: {
        backgroundColor: '#f8f9fa',
        padding: '1.5rem',
        borderRadius: '6px',
        lineHeight: '1.8',
    },
    
    noAddress: {
        color: '#999',
        fontStyle: 'italic',
        margin: 0,
    },

};

export default OrderDetailPage;