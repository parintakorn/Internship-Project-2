import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import generatePayload from 'promptpay-qr';
import api from '../api/axios';

const PaymentPage = () => {
    const { orderId } = useParams();
    const navigate = useNavigate();
    
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [slipFile, setSlipFile] = useState(null);
    const [slipPreview, setSlipPreview] = useState(null);

    // 🔥 ใส่เบอร์พร้อมเพย์ของคุณที่นี่! (เบอร์โทร 10 หลัก หรือ Tax ID 13 หลัก)
    const PROMPTPAY_NUMBER = '0918015295'; // ⬅️ เปลี่ยนเป็นของคุณ!

    useEffect(() => {
        fetchOrderDetails();
    }, [orderId]);

    const fetchOrderDetails = async () => {
        try {
            const response = await api.get(`/orders/${orderId}`);
            setOrder(response.data.order);
            console.log('📦 Order data:', response.data.order);
        } catch (error) {
            console.error('Error fetching order:', error);
            alert('ไม่สามารถโหลดข้อมูลคำสั่งซื้อได้');
            navigate('/orders');
        } finally {
            setLoading(false);
        }
    };

    // ✅ ฟังก์ชันสร้าง QR Code Payload พร้อมเพย์
    const generatePromptPayQR = () => {
        if (!order) return '';
        
        const amount = Math.floor(order.total_price);
        
        // สร้าง Payload สำหรับพร้อมเพย์
        const payload = generatePayload(PROMPTPAY_NUMBER, { amount });
        
        return payload;
    };

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (!file.type.startsWith('image/')) {
                alert('กรุณาอัพโหลดไฟล์รูปภาพเท่านั้น');
                return;
            }
            if (file.size > 5 * 1024 * 1024) {
                alert('ไฟล์มีขนาดใหญ่เกิน 5MB');
                return;
            }
            setSlipFile(file);
            setSlipPreview(URL.createObjectURL(file));
        }
    };

    const handleUploadSlip = async () => {
        if (!slipFile) {
            alert('กรุณาเลือกรูปสลิปก่อน');
            return;
        }

        setUploading(true);

        try {
            const formData = new FormData();
            formData.append('slip', slipFile);
            formData.append('order_id', orderId);

            const response = await api.post(`/payments/${orderId}/upload-slip`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });

            alert('✅ อัพโหลดสลิปสำเร็จ!\n\nกำลังรอการตรวจสอบ...');
            navigate('/orders');
        } catch (error) {
            console.error('Error uploading slip:', error);
            alert('❌ เกิดข้อผิดพลาดในการอัพโหลดสลิป');
        } finally {
            setUploading(false);
        }
    };

    if (loading) {
        return (
            <div style={styles.loadingContainer}>
                <div style={styles.spinner}>⏳</div>
                <p>กำลังโหลดข้อมูล...</p>
            </div>
        );
    }

    if (!order) {
        return (
            <div style={styles.errorContainer}>
                <h2>❌ ไม่พบคำสั่งซื้อ</h2>
                <button onClick={() => navigate('/orders')} style={styles.backButton}>
                    กลับหน้ารายการสั่งซื้อ
                </button>
            </div>
        );
    }

    const bankInfo = {
        bank: 'ธนาคารกสิกรไทย',
        accountName: 'นายปริณธกร ภัทรภนาวงศ์',
        accountNumber: '016-3-90846-8',
        branch: 'สาขาศรีนครินทร์'
    };

    // ✅ สร้าง QR Payload
    const qrPayload = generatePromptPayQR();

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <button onClick={() => navigate('/orders')} style={styles.backBtn}>
                    ← กลับ
                </button>
                <h1 style={styles.title}>💳 ชำระเงิน</h1>
            </div>

            {/* Order Info */}
            <div style={styles.orderInfo}>
                <div style={styles.infoRow}>
                    <span>เลขที่คำสั่งซื้อ:</span>
                    <strong>#{order.order_id}</strong>
                </div>
                <div style={styles.infoRow}>
                    <span>ยอดรวม:</span>
                    <strong style={styles.totalAmount}>
                        ฿{Math.floor(order.total_price).toLocaleString()}
                    </strong>
                </div>
                <div style={styles.infoRow}>
                    <span>สถานะ:</span>
                    <span style={styles.statusBadge}>{getStatusText(order.status)}</span>
                </div>
            </div>

            {/* Payment Methods */}
            <div style={styles.paymentSection}>
                {/* ✅ PromptPay - แสดง QR Code จริง */}
                {order.payment_method === 'promptpay' && (
                    <div style={styles.paymentCard}>
                        <div style={styles.cardHeader}>
                            <span style={styles.cardIcon}>💳</span>
                            <h2 style={styles.cardTitle}>ชำระเงินผ่านพร้อมเพย์</h2>
                        </div>
                        
                        <div style={styles.qrSection}>
                            <div style={styles.qrContainer}>
                                {/* ✅ แสดง QR Code จาก Library */}
                                <div style={styles.qrWrapper}>
                                    <QRCodeSVG 
                                        value={qrPayload}
                                        size={280}
                                        level="H"
                                        includeMargin={true}
                                    />
                                </div>
                            </div>
                            <div style={styles.qrInfo}>
                                <p style={styles.qrText}>
                                    📱 สแกน QR Code ด้วยแอปธนาคาร
                                </p>
                                <p style={styles.promptpayNumber}>
                                    🔢 พร้อมเพย์: <strong>{PROMPTPAY_NUMBER}</strong>
                                </p>
                                <p style={styles.qrAmount}>
                                    ฿{Math.floor(order.total_price).toLocaleString()}
                                </p>
                                <p style={styles.qrNote}>
                                    ⏰ กรุณาชำระภายใน 24 ชั่วโมง
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Bank Transfer */}
                {order.payment_method === 'transfer' && (
                    <div style={styles.paymentCard}>
                        <div style={styles.cardHeader}>
                            <span style={styles.cardIcon}>🏦</span>
                            <h2 style={styles.cardTitle}>โอนเงินผ่านธนาคาร</h2>
                        </div>
                        
                        <div style={styles.bankInfo}>
                            <div style={styles.bankRow}>
                                <span style={styles.bankLabel}>ธนาคาร:</span>
                                <strong>{bankInfo.bank}</strong>
                            </div>
                            <div style={styles.bankRow}>
                                <span style={styles.bankLabel}>ชื่อบัญชี:</span>
                                <strong>{bankInfo.accountName}</strong>
                            </div>
                            <div style={styles.bankRow}>
                                <span style={styles.bankLabel}>เลขที่บัญชี:</span>
                                <div style={styles.accountNumber}>
                                    <strong>{bankInfo.accountNumber}</strong>
                                    <button 
                                        style={styles.copyBtn}
                                        onClick={() => {
                                            navigator.clipboard.writeText(bankInfo.accountNumber);
                                            alert('✅ คัดลอกเลขบัญชีแล้ว');
                                        }}
                                    >
                                        📋 คัดลอก
                                    </button>
                                </div>
                            </div>
                            <div style={styles.bankRow}>
                                <span style={styles.bankLabel}>สาขา:</span>
                                <strong>{bankInfo.branch}</strong>
                            </div>
                            <div style={styles.bankRow}>
                                <span style={styles.bankLabel}>ยอดเงิน:</span>
                                <strong style={styles.transferAmount}>
                                    ฿{Math.floor(order.total_price).toLocaleString()}
                                </strong>
                            </div>
                        </div>

                        <div style={styles.bankNote}>
                            <p>⚠️ โปรดโอนเงินตามยอดที่ระบุอย่างถูกต้อง</p>
                            <p>⏰ กรุณาชำระภายใน 24 ชั่วโมง</p>
                        </div>
                    </div>
                )}

                {/* COD */}
                {order.payment_method === 'cod' && (
                    <div style={styles.paymentCard}>
                        <div style={styles.cardHeader}>
                            <span style={styles.cardIcon}>💵</span>
                            <h2 style={styles.cardTitle}>เก็บเงินปลายทาง (COD)</h2>
                        </div>
                        
                        <div style={styles.codInfo}>
                            <div style={styles.codIcon}>📦</div>
                            <h3 style={styles.codTitle}>ชำระเงินเมื่อรับสินค้า</h3>
                            <p style={styles.codAmount}>
                                ฿{Math.floor(order.total_price).toLocaleString()}
                            </p>
                            <p style={styles.codNote}>
                                กรุณาเตรียมเงินสดให้พอดีเมื่อพนักงานส่งของมาถึง
                            </p>
                            <div style={styles.codSteps}>
                                <p>✓ เราจะจัดส่งสินค้าภายใน 2-3 วันทำการ</p>
                                <p>✓ โทรแจ้งก่อนส่งของ</p>
                                <p>✓ ชำระเป็นเงินสดกับพนักงานส่งของ</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Upload Slip Section (PromptPay & Transfer only) */}
                {(order.payment_method === 'promptpay' || order.payment_method === 'transfer') && (
                    <div style={styles.uploadCard}>
                        <h3 style={styles.uploadTitle}>
                            📸 อัพโหลดสลิปการโอนเงิน
                        </h3>
                        
                        <div style={styles.uploadArea}>
                            {slipPreview ? (
                                <div style={styles.previewContainer}>
                                    <img 
                                        src={slipPreview} 
                                        alt="Slip Preview" 
                                        style={styles.slipPreview}
                                    />
                                    <button 
                                        style={styles.removeBtn}
                                        onClick={() => {
                                            setSlipFile(null);
                                            setSlipPreview(null);
                                        }}
                                    >
                                        ✕ ลบ
                                    </button>
                                </div>
                            ) : (
                                <label style={styles.uploadLabel}>
                                    <input 
                                        type="file" 
                                        accept="image/*"
                                        onChange={handleFileSelect}
                                        style={styles.fileInput}
                                    />
                                    <div style={styles.uploadIcon}>📁</div>
                                    <p style={styles.uploadText}>
                                        คลิกเพื่อเลือกรูปสลิป
                                    </p>
                                    <p style={styles.uploadHint}>
                                        รองรับไฟล์ JPG, PNG (สูงสุด 5MB)
                                    </p>
                                </label>
                            )}
                        </div>

                        <button 
                            style={{
                                ...styles.uploadBtn,
                                ...((!slipFile || uploading) && styles.uploadBtnDisabled)
                            }}
                            onClick={handleUploadSlip}
                            disabled={!slipFile || uploading}
                        >
                            {uploading ? '⏳ กำลังอัพโหลด...' : '✓ ยืนยันการชำระเงิน'}
                        </button>

                        <p style={styles.uploadNote}>
                            💡 เมื่ออัพโหลดสลิปแล้ว ระบบจะตรวจสอบภายใน 1-2 ชั่วโมง
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

const getStatusText = (status) => {
    const statusMap = {
        'pending': '⏳ รอชำระเงิน',
        'paid': '✅ ชำระแล้ว',
        'shipped': '🚚 จัดส่งแล้ว',
        'completed': '✔️ สำเร็จ',
        'cancelled': '❌ ยกเลิก'
    };
    return statusMap[status] || status;
};

const styles = {
    container: {
        maxWidth: '800px',
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
    orderInfo: {
        backgroundColor: 'white',
        padding: '1.5rem',
        borderRadius: '8px',
        marginBottom: '1.5rem',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    },
    infoRow: {
        display: 'flex',
        justifyContent: 'space-between',
        marginBottom: '0.75rem',
        fontSize: '1rem',
    },
    totalAmount: {
        fontSize: '1.5rem',
        color: '#ee4d2d',
    },
    statusBadge: {
        padding: '0.25rem 0.75rem',
        borderRadius: '12px',
        backgroundColor: '#fff3e0',
        color: '#ff9800',
        fontSize: '0.9rem',
        fontWeight: '600',
    },
    paymentSection: {
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem',
    },
    paymentCard: {
        backgroundColor: 'white',
        padding: '2rem',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    },
    cardHeader: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        marginBottom: '1.5rem',
    },
    cardIcon: {
        fontSize: '2rem',
    },
    cardTitle: {
        fontSize: '1.5rem',
        margin: 0,
        color: '#333',
    },
    qrSection: {
        display: 'flex',
        gap: '2rem',
        alignItems: 'center',
        flexWrap: 'wrap',
    },
    qrContainer: {
        flexShrink: 0,
    },
    // ✅ Style สำหรับ QR Code
    qrWrapper: {
        padding: '1rem',
        backgroundColor: 'white',
        borderRadius: '8px',
        border: '2px solid #ddd',
        display: 'inline-block',
    },
    qrInfo: {
        flex: 1,
        minWidth: '250px',
    },
    qrText: {
        fontSize: '1.1rem',
        color: '#666',
        marginBottom: '0.5rem',
    },
    // ✅ แสดงเบอร์พร้อมเพย์
    promptpayNumber: {
        fontSize: '1rem',
        color: '#333',
        marginBottom: '1rem',
        padding: '0.75rem',
        backgroundColor: '#f0f0f0',
        borderRadius: '6px',
        border: '1px solid #ddd',
    },
    qrAmount: {
        fontSize: '2.5rem',
        fontWeight: 'bold',
        color: '#ee4d2d',
        margin: '1rem 0',
    },
    qrNote: {
        fontSize: '1rem',
        color: '#ff9800',
        fontWeight: '600',
    },
    bankInfo: {
        backgroundColor: '#f8f9fa',
        padding: '1.5rem',
        borderRadius: '8px',
        marginBottom: '1rem',
    },
    bankRow: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1rem',
        fontSize: '1rem',
    },
    bankLabel: {
        color: '#666',
        minWidth: '100px',
    },
    accountNumber: {
        display: 'flex',
        gap: '1rem',
        alignItems: 'center',
    },
    copyBtn: {
        padding: '0.5rem 1rem',
        backgroundColor: '#007bff',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '0.85rem',
        fontWeight: '600',
    },
    transferAmount: {
        fontSize: '1.5rem',
        color: '#ee4d2d',
    },
    bankNote: {
        backgroundColor: '#fff3e0',
        padding: '1rem',
        borderRadius: '6px',
        borderLeft: '4px solid #ff9800',
    },
    codInfo: {
        textAlign: 'center',
        padding: '2rem',
    },
    codIcon: {
        fontSize: '4rem',
        marginBottom: '1rem',
    },
    codTitle: {
        fontSize: '1.5rem',
        color: '#333',
        marginBottom: '1rem',
    },
    codAmount: {
        fontSize: '2.5rem',
        fontWeight: 'bold',
        color: '#ee4d2d',
        margin: '1rem 0',
    },
    codNote: {
        fontSize: '1rem',
        color: '#666',
        marginBottom: '1.5rem',
    },
    codSteps: {
        textAlign: 'left',
        backgroundColor: '#f8f9fa',
        padding: '1.5rem',
        borderRadius: '8px',
        maxWidth: '400px',
        margin: '0 auto',
    },
    uploadCard: {
        backgroundColor: 'white',
        padding: '2rem',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    },
    uploadTitle: {
        fontSize: '1.3rem',
        color: '#333',
        marginBottom: '1.5rem',
    },
    uploadArea: {
        marginBottom: '1.5rem',
    },
    uploadLabel: {
        display: 'block',
        border: '2px dashed #ddd',
        borderRadius: '8px',
        padding: '3rem 2rem',
        textAlign: 'center',
        cursor: 'pointer',
        transition: 'all 0.3s',
    },
    fileInput: {
        display: 'none',
    },
    uploadIcon: {
        fontSize: '3rem',
        marginBottom: '1rem',
    },
    uploadText: {
        fontSize: '1.1rem',
        color: '#333',
        marginBottom: '0.5rem',
    },
    uploadHint: {
        fontSize: '0.9rem',
        color: '#999',
    },
    previewContainer: {
        position: 'relative',
        display: 'inline-block',
    },
    slipPreview: {
        maxWidth: '100%',
        maxHeight: '400px',
        borderRadius: '8px',
        border: '2px solid #ddd',
    },
    removeBtn: {
        position: 'absolute',
        top: '10px',
        right: '10px',
        backgroundColor: '#f44336',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        padding: '0.5rem 1rem',
        cursor: 'pointer',
        fontWeight: '600',
    },
    uploadBtn: {
        width: '100%',
        padding: '1rem',
        backgroundColor: '#4CAF50',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        fontSize: '1.1rem',
        fontWeight: 'bold',
        cursor: 'pointer',
    },
    uploadBtnDisabled: {
        backgroundColor: '#ccc',
        cursor: 'not-allowed',
    },
    uploadNote: {
        textAlign: 'center',
        fontSize: '0.9rem',
        color: '#666',
        marginTop: '1rem',
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
        marginBottom: '1rem',
    },
    errorContainer: {
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f5f5f5',
        padding: '2rem',
    },
    backButton: {
        marginTop: '2rem',
        padding: '1rem 2rem',
        backgroundColor: '#007bff',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '1rem',
        fontWeight: '600',
    },
};

export default PaymentPage;