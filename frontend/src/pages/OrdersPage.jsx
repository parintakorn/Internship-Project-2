import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

const OrdersPage = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        fetchOrders();
    }, []);

    const fetchOrders = async () => {
        try {
            setLoading(true);
            const response = await api.get('/orders');
            setOrders(response.data);
            console.log('📦 Orders:', response.data);
        } catch (error) {
            console.error('Error fetching orders:', error);
        } finally {
            setLoading(false);
        }
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
                ...styles.statusBadge,
                backgroundColor: config.color + '20',
                color: config.color,
                border: `1px solid ${config.color}`
            }}>
                {config.label}
            </span>
        );
    };

    if (loading) {
        return (
            <div style={styles.loadingContainer}>
                <div style={styles.spinner}>⏳</div>
                <p>กำลังโหลด...</p>
            </div>
        );
    }

    if (orders.length === 0) {
        return (
            <div style={styles.emptyContainer}>
                <div style={styles.emptyContent}>
                    <div style={styles.emptyIcon}>📦</div>
                    <h2>ยังไม่มีคำสั่งซื้อ</h2>
                    <p>เริ่มช้อปปิ้งเลย!</p>
                    <button 
                        onClick={() => navigate('/products')}
                        style={styles.shopButton}
                    >
                        🛍️ เริ่มช้อปปิ้ง
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div style={styles.container}>
            <h1 style={styles.title}>📦 คำสั่งซื้อของฉัน</h1>

            <div style={styles.ordersList}>
                {orders.map((order) => (
                    <div key={order.order_id} style={styles.orderCard}>
                        <div style={styles.orderHeader}>
                            <div>
                                <div style={styles.orderId}>
                                    คำสั่งซื้อ #{order.order_id}
                                </div>
                                <div style={styles.orderDate}>
                                    {new Date(order.created_at).toLocaleDateString('th-TH', {
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })}
                                </div>
                            </div>
                            {getStatusBadge(order.status)}
                        </div>

                        <div style={styles.orderBody}>
                            <div style={styles.orderInfo}>
                                <div style={styles.infoRow}>
                                    <span>จำนวนสินค้า:</span>
                                    <strong>{order.item_count || 0} รายการ</strong>
                                </div>
                                <div style={styles.infoRow}>
                                    <span>ยอดรวม:</span>
                                    <strong style={styles.totalPrice}>
                                        ฿{Math.floor(order.total_price).toLocaleString()}
                                    </strong>
                                </div>
                                <div style={styles.infoRow}>
                                    <span>วิธีชำระเงิน:</span>
                                    <strong>{getPaymentMethodText(order.payment_method)}</strong>
                                </div>
                            </div>

                            <div style={styles.orderActions}>
                                {/* ✅ ปุ่มชำระเงิน (แสดงเฉพาะ pending) */}
                                {order.status === 'pending' && (
                                    <button 
                                        onClick={() => navigate(`/payment/${order.order_id}`)}
                                        style={styles.payButton}
                                    >
                                        💳 ชำระเงิน
                                    </button>
                                )}

                                <button 
                                    onClick={() => navigate(`/orders/${order.order_id}`)}
                                    style={styles.detailButton}
                                >
                                    👁️ ดูรายละเอียด
                                </button>

                                {/* ปุ่มยกเลิก (แสดงเฉพาะ pending) */}
                                {order.status === 'pending' && (
                                    <button 
                                        onClick={async () => {
                                            if (window.confirm('ต้องการยกเลิกคำสั่งซื้อนี้?')) {
                                                try {
                                                    await api.put(`/orders/${order.order_id}/cancel`);
                                                    alert('✅ ยกเลิกคำสั่งซื้อสำเร็จ');
                                                    fetchOrders();
                                                } catch (error) {
                                                    alert('❌ ไม่สามารถยกเลิกได้');
                                                }
                                            }
                                        }}
                                        style={styles.cancelButton}
                                    >
                                        ❌ ยกเลิก
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
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

const styles = {
    container: {
        maxWidth: '900px',
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
    ordersList: {
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem',
    },
    orderCard: {
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        overflow: 'hidden',
    },
    orderHeader: {
        padding: '1.5rem',
        backgroundColor: '#f8f9fa',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid #e0e0e0',
    },
    orderId: {
        fontSize: '1.1rem',
        fontWeight: 'bold',
        color: '#333',
        marginBottom: '0.25rem',
    },
    orderDate: {
        fontSize: '0.9rem',
        color: '#666',
    },
    statusBadge: {
        padding: '0.5rem 1rem',
        borderRadius: '20px',
        fontSize: '0.9rem',
        fontWeight: '600',
    },
    orderBody: {
        padding: '1.5rem',
    },
    orderInfo: {
        marginBottom: '1.5rem',
    },
    infoRow: {
        display: 'flex',
        justifyContent: 'space-between',
        marginBottom: '0.75rem',
        fontSize: '1rem',
    },
    totalPrice: {
        fontSize: '1.3rem',
        color: '#ee4d2d',
    },
    orderActions: {
        display: 'flex',
        gap: '1rem',
        flexWrap: 'wrap',
    },
    // ✅ ปุ่มชำระเงิน
    payButton: {
        flex: 1,
        padding: '0.75rem 1.5rem',
        backgroundColor: '#4CAF50',
        color: 'white',
        border: 'none',
        borderRadius: '6px',
        cursor: 'pointer',
        fontSize: '1rem',
        fontWeight: 'bold',
        transition: 'all 0.3s',
        minWidth: '120px',
    },
    detailButton: {
        flex: 1,
        padding: '0.75rem 1.5rem',
        backgroundColor: '#2196f3',
        color: 'white',
        border: 'none',
        borderRadius: '6px',
        cursor: 'pointer',
        fontSize: '1rem',
        fontWeight: 'bold',
        transition: 'all 0.3s',
        minWidth: '120px',
    },
    cancelButton: {
        flex: 1,
        padding: '0.75rem 1.5rem',
        backgroundColor: '#f44336',
        color: 'white',
        border: 'none',
        borderRadius: '6px',
        cursor: 'pointer',
        fontSize: '1rem',
        fontWeight: 'bold',
        transition: 'all 0.3s',
        minWidth: '120px',
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
        animation: 'spin 1s linear infinite',
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
    shopButton: {
        marginTop: '2rem',
        padding: '1rem 2rem',
        backgroundColor: '#ee4d2d',
        color: 'white',
        border: 'none',
        borderRadius: '6px',
        cursor: 'pointer',
        fontSize: '1.1rem',
        fontWeight: 'bold',
    },
};

export default OrdersPage;