import { useState, useEffect } from 'react';
import api from '../../api/axios';

const getPaymentMethodText = (method) => {
  const methodMap = {
    'promptpay': '💳 พร้อมเพย์',
    'transfer': '🏦 โอนเงินผ่านธนาคาร',
    'cod': '💵 เก็บเงินปลายทาง'
  };
  return methodMap[method] || method;
};

// ── parse address ที่อาจเป็น JSON string หรือ object ──────────────
const parseAddress = (raw) => {
  if (!raw) return { line1: '', district: '', province: '', postal_code: '', phone: '' };
  if (typeof raw === 'object') return raw;
  try {
    const obj = JSON.parse(raw);
    return {
      line1:       obj.full_address || obj.address || '',
      district:    obj.district || '',
      province:    obj.province || '',
      postal_code: obj.postal_code || '',
      phone:       obj.phone || '',
      full_name:   obj.full_name || '',
    };
  } catch {
    return { line1: raw, district: '', province: '', postal_code: '', phone: '' };
  }
};

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [pagination, setPagination] = useState({});
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [isCashPayment, setIsCashPayment] = useState(true);
  const [isCreditPayment, setIsCreditPayment] = useState(false);

  const API_BASE_URL = import.meta.env.VITE_API_URL;

  useEffect(() => {
    fetchOrders();
  }, [statusFilter, search]);

  const fetchOrders = async (page = 1) => {
    try {
      setLoading(true);
      const response = await api.get('/admin/orders', {
        params: { page, status: statusFilter, search }
      });
      setOrders(response.data.orders);
      setPagination(response.data.pagination);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchOrderDetails = async (orderId) => {
    try {
      const orderResponse = await api.get(`/admin/orders/${orderId}`);
      const responseData = orderResponse.data;
      const orderData = responseData.order || responseData;

      orderData.items   = responseData.items || [];
      orderData.payment = responseData.payment || orderData.payment || null;

      // ── parse shipping_address ──────────────────────────────────
      const addrParsed = parseAddress(orderData.shipping_address);

      if (orderData.user_id && orderData.user_id !== null) {
        try {
          const customerResponse = await api.get(`/admin/users/${orderData.user_id}`);
          const c = customerResponse.data;

          // ที่อยู่จาก user record อาจเป็น JSON ด้วย
          const userAddr = parseAddress(c.address || c.shipping_address || '');

          orderData.customerDetails = {
            name:        c.name || addrParsed.full_name || orderData.customer_name || 'ไม่ระบุชื่อ',
            email:       c.email || '',
            phone:       c.phone || addrParsed.phone || orderData.customer_phone || '-',
            line1:       userAddr.line1  || addrParsed.line1  || '',
            district:    userAddr.district    || addrParsed.district    || c.district    || '',
            province:    userAddr.province    || addrParsed.province    || c.province    || '',
            postal_code: userAddr.postal_code || addrParsed.postal_code || c.postal_code || '',
          };
        } catch {
          orderData.customerDetails = {
            name:        addrParsed.full_name || orderData.customer_name || 'ไม่ระบุชื่อ',
            phone:       addrParsed.phone     || orderData.customer_phone || '-',
            line1:       addrParsed.line1     || '',
            district:    addrParsed.district  || '',
            province:    addrParsed.province  || '',
            postal_code: addrParsed.postal_code || '',
            email:       orderData.customer_email || '',
          };
        }
      } else {
        orderData.customerDetails = {
          name:        addrParsed.full_name || orderData.customer_name || 'ไม่ระบุชื่อ',
          phone:       addrParsed.phone     || orderData.customer_phone || '-',
          line1:       addrParsed.line1     || '',
          district:    addrParsed.district  || '',
          province:    addrParsed.province  || '',
          postal_code: addrParsed.postal_code || '',
          email:       orderData.customer_email || '',
        };
      }

      setSelectedOrder(orderData);
      setShowDetailModal(true);
      setIsCashPayment(true);
      setIsCreditPayment(false);
    } catch (error) {
      console.error('Error fetching details:', error);
      alert('ไม่สามารถโหลดรายละเอียดได้');
    }
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      await api.put(`/admin/orders/${orderId}/status`, { status: newStatus });
      alert('✅ อัปเดตสถานะสำเร็จ!');
      fetchOrders(pagination.currentPage);
      if (selectedOrder) setSelectedOrder({ ...selectedOrder, status: newStatus });
    } catch {
      alert('❌ อัปเดตไม่สำเร็จ');
    }
  };

  const deleteOrder = async (orderId) => {
    if (!window.confirm('⚠️ ยืนยันการลบคำสั่งซื้อนี้?')) return;
    try {
      await api.delete(`/admin/orders/${orderId}`);
      alert('✅ ลบสำเร็จ');
      setShowDetailModal(false);
      fetchOrders(pagination.currentPage);
    } catch {
      alert('❌ ลบไม่สำเร็จ');
    }
  };

  const getCalculatedTotals = () => {
    if (!selectedOrder || !selectedOrder.items) return { subtotal: '0.00', vat: '0.00', total: '0.00' };
    const totalWithVat = selectedOrder.items.reduce((sum, item) => {
      return sum + parseFloat(item.price_at_time || item.price || 0) * parseInt(item.quantity || 0);
    }, 0);
    const vat      = totalWithVat * 0.07 / 1.07;
    const subtotal = totalWithVat - vat;
    const fmt = (n) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return { subtotal: fmt(subtotal), vat: fmt(vat), total: fmt(totalWithVat) };
  };

  const getStatusBadge = (status) => {
    const cfg = {
      pending:   { label: 'รอชำระเงิน', color: '#ffa726', icon: '⏳' },
      paid:      { label: 'ชำระแล้ว',   color: '#66bb6a', icon: '✅' },
      shipped:   { label: 'จัดส่งแล้ว', color: '#42a5f5', icon: '🚚' },
      completed: { label: 'สำเร็จ',     color: '#26a69a', icon: '✔️' },
      cancelled: { label: 'ยกเลิก',     color: '#ef5350', icon: '❌' },
    }[status] || { label: 'รอชำระเงิน', color: '#ffa726', icon: '⏳' };
    return (
      <span style={{
        backgroundColor: cfg.color + '20', color: cfg.color,
        border: `1px solid ${cfg.color}40`, padding: '6px 14px',
        borderRadius: '20px', fontSize: '13px', fontWeight: '600'
      }}>{cfg.icon} {cfg.label}</span>
    );
  };

  const totals = getCalculatedTotals();
  const cd = selectedOrder?.customerDetails || {};

  if (loading && orders.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', backgroundColor: '#f5f7fa' }}>
        <div style={{ width: '50px', height: '50px', border: '5px solid #e0e0e0', borderTop: '5px solid #2196f3', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
        <p style={{ marginTop: '20px', color: '#666', fontSize: '16px' }}>กำลังโหลดข้อมูล...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '30px', maxWidth: '1400px', margin: '0 auto', fontFamily: '"Inter", "Segoe UI", Tahoma, sans-serif', backgroundColor: '#f5f7fa', minHeight: '100vh' }}>

      {/* Header */}
      <div className="no-print" style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '30px', marginBottom: '25px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
        <div>
          <h1 style={{ fontSize: '32px', fontWeight: '700', color: '#1a1a1a', margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '36px' }}>📦</span>ระบบจัดการคำสั่งซื้อ
          </h1>
          <p style={{ fontSize: '14px', color: '#666', margin: 0 }}>จัดการและติดตามคำสั่งซื้อทั้งหมด</p>
        </div>
        <button onClick={() => fetchOrders(pagination.currentPage)} style={{ padding: '12px 24px', backgroundColor: '#fff', border: '2px solid #e0e0e0', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '600', color: '#333', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '16px' }}>🔄</span>รีเฟรชข้อมูล
        </button>
      </div>

      {/* Stats */}
      <div className="no-print" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '25px' }}>
        {[
          { status: 'pending',   icon: '⏳', label: 'รอชำระเงิน', color: '#ffa726' },
          { status: 'paid',      icon: '✅', label: 'ชำระแล้ว',   color: '#66bb6a' },
          { status: 'shipped',   icon: '🚚', label: 'จัดส่งแล้ว', color: '#42a5f5' },
          { status: 'completed', icon: '✔️', label: 'สำเร็จ',     color: '#26a69a' },
        ].map(({ status, icon, label, color }) => (
          <div key={status} style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '24px', display: 'flex', alignItems: 'center', gap: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', borderLeft: `4px solid ${color}` }}>
            <div style={{ fontSize: '36px', lineHeight: 1 }}>{icon}</div>
            <div>
              <div style={{ fontSize: '13px', color: '#666', marginBottom: '4px' }}>{label}</div>
              <div style={{ fontSize: '28px', fontWeight: '700', color: '#1a1a1a' }}>{orders.filter(o => o.status === status).length}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="no-print" style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '20px', marginBottom: '25px', display: 'flex', gap: '15px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
        <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center' }}>
          <span style={{ position: 'absolute', left: '15px', fontSize: '18px', pointerEvents: 'none' }}>🔍</span>
          <input type="text" placeholder="ค้นหา Order ID หรือชื่อลูกค้า..." value={search} onChange={(e) => setSearch(e.target.value)}
            style={{ flex: 1, padding: '12px 15px 12px 45px', border: '2px solid #e0e0e0', borderRadius: '8px', fontSize: '14px', outline: 'none', width: '100%' }} />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          style={{ padding: '12px 15px', border: '2px solid #e0e0e0', borderRadius: '8px', fontSize: '14px', backgroundColor: '#fff', cursor: 'pointer', minWidth: '200px', outline: 'none' }}>
          <option value="">📋 ทุกสถานะ</option>
          <option value="pending">⏳ รอชำระเงิน</option>
          <option value="paid">✅ ชำระแล้ว</option>
          <option value="shipped">🚚 จัดส่งแล้ว</option>
          <option value="completed">✔️ สำเร็จ</option>
          <option value="cancelled">❌ ยกเลิก</option>
        </select>
      </div>

      {/* Table */}
      <div className="no-print" style={{ backgroundColor: '#fff', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['Order ID','ข้อมูลลูกค้า','ยอดเงิน','สถานะ','วันที่สั่งซื้อ','จัดการ'].map(h => (
                <th key={h} style={{ backgroundColor: '#f8f9fa', padding: '18px 20px', textAlign: 'left', fontSize: '13px', fontWeight: '700', color: '#666', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '2px solid #e0e0e0' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 ? (
              <tr><td colSpan="6" style={{ padding: '60px 20px', textAlign: 'center' }}>
                <div style={{ fontSize: '64px', marginBottom: '15px' }}>📭</div>
                <div style={{ fontSize: '16px', color: '#999' }}>ไม่พบคำสั่งซื้อ</div>
              </td></tr>
            ) : orders.map((order) => (
              <tr key={order.order_id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                <td style={{ padding: '20px' }}><div style={{ fontWeight: '700', color: '#2196f3', fontSize: '15px' }}>#{order.order_id}</div></td>
                <td style={{ padding: '20px' }}>
                  <div style={{ fontWeight: '600', color: '#1a1a1a' }}>{order.customer_name || 'ไม่ระบุชื่อ'}</div>
                  <div style={{ fontSize: '12px', color: '#999' }}>{order.customer_phone || '-'}</div>
                </td>
                <td style={{ padding: '20px' }}><div style={{ fontWeight: '700', color: '#26a69a', fontSize: '16px' }}>฿{parseFloat(order.total_price || 0).toLocaleString()}</div></td>
                <td style={{ padding: '20px' }}>{getStatusBadge(order.status)}</td>
                <td style={{ padding: '20px' }}><div style={{ fontSize: '13px', color: '#666' }}>{order.created_at ? new Date(order.created_at).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' }) : '-'}</div></td>
                <td style={{ padding: '20px' }}>
                  <button onClick={() => fetchOrderDetails(order.order_id)} style={{ padding: '10px 20px', backgroundColor: '#2196f3', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '6px', boxShadow: '0 2px 6px rgba(33,150,243,0.3)' }}>
                    <span style={{ fontSize: '16px' }}>👁️</span>ดูรายละเอียด
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── MODAL ── */}
      {showDetailModal && selectedOrder && (
        <div className="print-modal-overlay" style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000, padding: '20px' }} onClick={() => setShowDetailModal(false)}>
          <div className="print-modal-content" style={{ backgroundColor: '#F5E6D3', borderRadius: '8px', width: '100%', maxWidth: '1300px', maxHeight: '95vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.4)', border: '3px solid #C8A882', position: 'relative', zIndex: 2001 }} onClick={(e) => e.stopPropagation()}>

            {/* ── Header ── */}
            <div style={{ padding: '15px 20px', backgroundColor: '#F5E6D3', position: 'relative', borderBottom: '2px solid #C8A882' }}>

              {/* Logo + Company */}
              <div style={{ width: '100%', borderBottom: '2px solid #C8A882', paddingBottom: '15px', marginBottom: '15px', display: 'flex', alignItems: 'flex-start', gap: '20px' }}>
                <div style={{ flex: '0 0 auto' }}>
                  <img src="/images/1212.jpg" alt="BIGURI Logo" style={{ width: '200px', height: '200px', objectFit: 'contain' }} />
                </div>
                <div style={{ flex: 1, fontSize: '14px', color: '#333', lineHeight: '1.8', paddingTop: '5px' }}>
                  <div style={{ fontWeight: 'bold', fontSize: '36px', marginBottom: '8px', color: '#000' }}>BIGURI - PREMIUM JAPANESE FOOD</div>
                  <div style={{ fontWeight: '600', color: '#000', fontSize: '14px', marginBottom: '4px' }}>สำนักงานใหญ่</div>
                  <div style={{ fontSize: '14px', marginBottom: '2px' }}>52 ซอยรัชดาภิเษก 36 แยก11 แขวงจันทรเกษม เขตจตุจักร กรุงเทพมหานคร 10900</div>
                  <div style={{ fontSize: '13px', color: '#555', marginBottom: '6px' }}>Head office : 52 Ratchada 36 Yak 11 Chankasem, Chatuchak, Bangkok 10900</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '14px', fontWeight: '600' }}>โทร.</span>
                    <input type="text" defaultValue="0629532761" style={{ padding: '4px 10px', border: '1px solid #999', backgroundColor: '#fff', fontSize: '14px', width: '150px', borderRadius: '4px', outline: 'none' }} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '14px', fontWeight: '600' }}>เลขประจำตัวผู้เสียภาษี</span>
                    <input type="text" defaultValue="" placeholder="เลขประจำตัวผู้เสียภาษี 13 หลัก" maxLength="13" style={{ padding: '4px 10px', border: '1px solid #999', backgroundColor: '#fff', fontSize: '14px', width: '200px', borderRadius: '4px', outline: 'none' }} />
                  </div>
                </div>
                <div style={{ flex: '0 0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', paddingTop: '5px' }}>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: '#000', textAlign: 'center', lineHeight: '1.4' }}>Facebook : Biguri<br />วัตถุดิบอาหารญี่ปุ่นพรีเมียม</div>
                  <div style={{ padding: '8px', backgroundColor: '#fff', border: '2px solid #C8A882', borderRadius: '4px' }}>
                    <img src="/images/13541.jpg" alt="LINE QR Code" style={{ width: '150px', height: '150px', display: 'block' }} />
                  </div>
                </div>
              </div>

              {/* Customer + Doc Info */}
              <div style={{ display: 'flex', gap: '15px' }}>

                {/* ── ซ้าย: ข้อมูลลูกค้า (parse แล้ว) ── */}
                <div style={{ flex: 1, paddingRight: '15px', borderRight: '1px solid #C8A882' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '14px' }}>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ minWidth: '80px', fontWeight: '600', fontSize: '14px' }}>รหัสลูกค้า</span>
                      <input type="text" defaultValue="BIGURI" style={{ padding: '4px 10px', border: '1px solid #999', backgroundColor: '#fff', fontSize: '14px', width: '140px' }} />
                      <button className="no-print" style={{ padding: '3px 10px', border: '1px solid #999', backgroundColor: '#e8f4f8', cursor: 'pointer', fontSize: '12px', borderRadius: '3px' }}>🔍</button>
                    </div>

                    {/* ชื่อลูกค้า — parse แล้ว ไม่มี JSON */}
                    <div style={{ paddingLeft: '88px', fontSize: '14px', color: '#000', lineHeight: '1.8' }}>
                      <strong>{cd.name || selectedOrder.customer_name || 'ไม่ระบุชื่อ'}</strong>
                    </div>

                    {/* ที่อยู่บรรทัดแรก */}
                    <div style={{ paddingLeft: '88px', fontSize: '14px', color: '#000' }}>
                      {cd.line1 || '-'}
                    </div>

                    {/* อำเภอ/เขต */}
                    {cd.district && (
                      <div style={{ paddingLeft: '88px', fontSize: '14px', color: '#333' }}>
                        {cd.district}
                      </div>
                    )}

                    {/* จังหวัด + รหัสไปรษณีย์ */}
                    <div style={{ paddingLeft: '88px', fontSize: '14px', color: '#333' }}>
                      {cd.province ? `จังหวัด${cd.province}` : ''}{cd.postal_code ? `  ${cd.postal_code}` : ''}
                    </div>

                    {/* โทร */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ minWidth: '80px', fontSize: '14px' }}>โทร.</span>
                      <span style={{ fontSize: '14px' }}>{cd.phone || selectedOrder.customer_phone || '-'}</span>
                    </div>

                  </div>
                </div>

                {/* ── ขวา: ข้อมูลเอกสาร ── */}
                <div style={{ flex: 0, minWidth: '500px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'flex-end' }}>
                    <span style={{ minWidth: '60px', textAlign: 'right' }}>แยก</span>
                    <select defaultValue="ขาย2" style={{ padding: '4px 8px', border: '1px solid #999', backgroundColor: '#fff', fontSize: '12px', width: '120px' }}>
                      <option>ขาย1</option><option>ขาย2</option>
                    </select>
                    <button className="no-print" style={{ padding: '3px 10px', border: '1px solid #999', backgroundColor: '#e8f4f8', cursor: 'pointer', fontSize: '11px', borderRadius: '3px' }}>🔍</button>
                    <span style={{ marginLeft: '20px' }}>ขาย VAT</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'flex-end' }}>
                    <span style={{ minWidth: '80px', textAlign: 'right' }}>เลขที่เอกสาร</span>
                    <input type="text" value={`IV${String(selectedOrder.order_id).padStart(7, '0')}`} readOnly style={{ padding: '4px 8px', border: '1px solid #999', backgroundColor: '#f5f5f5', fontSize: '12px', width: '150px', cursor: 'not-allowed' }} />
                    <span style={{ marginLeft: '15px', minWidth: '40px', textAlign: 'right' }}>วันที่</span>
                    <input type="date" defaultValue={selectedOrder.created_at ? new Date(selectedOrder.created_at).toISOString().split('T')[0] : ''} style={{ padding: '4px 8px', border: '1px solid #999', backgroundColor: '#fff', fontSize: '12px', width: '150px' }} />
                    <button className="no-print" style={{ padding: '3px 10px', border: '1px solid #999', backgroundColor: '#e8f4f8', cursor: 'pointer', fontSize: '11px', borderRadius: '3px' }}>🔍</button>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'flex-end' }}>
                    <span style={{ minWidth: '80px', textAlign: 'right' }}>ใบสั่งขาย</span>
                    <input type="text" defaultValue="" placeholder="เลขใบสั่งขาย" style={{ padding: '4px 8px', border: '1px solid #999', backgroundColor: '#fff', fontSize: '12px', width: '150px' }} />
                    <button className="no-print" style={{ padding: '3px 10px', border: '1px solid #999', backgroundColor: '#e8f4f8', cursor: 'pointer', fontSize: '11px', borderRadius: '3px' }}>🔍</button>
                    <span style={{ fontSize: '11px', color: '#666' }}>หมายเหตุเอกสารใบสั่งขาย</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'flex-end' }}>
                    <span style={{ minWidth: '80px', textAlign: 'right' }}>เครดิต</span>
                    <input type="number" defaultValue="1" min="0" style={{ padding: '4px 8px', border: '1px solid #999', backgroundColor: '#fff', fontSize: '12px', width: '60px', textAlign: 'center' }} />
                    <span>วัน</span>
                    <span style={{ marginLeft: '10px', minWidth: '80px', textAlign: 'right' }}>ครบกำหนด</span>
                    <input type="date" defaultValue={selectedOrder.created_at ? new Date(new Date(selectedOrder.created_at).getTime() + 86400000).toISOString().split('T')[0] : ''} style={{ padding: '4px 8px', border: '1px solid #999', backgroundColor: '#fff', fontSize: '12px', width: '150px' }} />
                    <button className="no-print" style={{ padding: '3px 10px', border: '1px solid #999', backgroundColor: '#e8f4f8', cursor: 'pointer', fontSize: '11px', borderRadius: '3px' }}>🔍</button>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'flex-end' }}>
                    <span style={{ minWidth: '80px', textAlign: 'right' }}>พนักงานขาย</span>
                    <input type="text" defaultValue="35" style={{ padding: '4px 8px', border: '1px solid #999', backgroundColor: '#fff', fontSize: '12px', width: '60px', textAlign: 'center' }} />
                    <button className="no-print" style={{ padding: '3px 10px', border: '1px solid #999', backgroundColor: '#e8f4f8', cursor: 'pointer', fontSize: '11px', borderRadius: '3px' }}>🔍</button>
                    <input type="text" defaultValue="พนักงานลีพรมนมาดา" style={{ padding: '4px 8px', border: '1px solid #999', backgroundColor: '#fff', fontSize: '12px', width: '200px' }} />
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'flex-end' }}>
                    <span style={{ minWidth: '80px', textAlign: 'right' }}>พนักงานสั่งของ</span>
                    <input type="text" defaultValue="" placeholder="รหัสพนักงาน" style={{ padding: '4px 8px', border: '1px solid #999', backgroundColor: '#fff', fontSize: '12px', width: '150px' }} />
                    <button className="no-print" style={{ padding: '3px 10px', border: '1px solid #999', backgroundColor: '#e8f4f8', cursor: 'pointer', fontSize: '11px', borderRadius: '3px' }}>🔍</button>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'flex-end' }}>
                    <span style={{ minWidth: '80px', textAlign: 'right' }}>เซลการขาย</span>
                    <input type="text" defaultValue="" placeholder="รหัสเซล" style={{ padding: '4px 8px', border: '1px solid #999', backgroundColor: '#fff', fontSize: '12px', width: '120px' }} />
                    <button className="no-print" style={{ padding: '3px 10px', border: '1px solid #999', backgroundColor: '#e8f4f8', cursor: 'pointer', fontSize: '11px', borderRadius: '3px' }}>🔍</button>
                    <span style={{ marginLeft: '10px', minWidth: '70px', textAlign: 'right' }}>ขนส่งโดย</span>
                    <input type="text" defaultValue="" placeholder="ชื่อขนส่ง" style={{ padding: '4px 8px', border: '1px solid #999', backgroundColor: '#fff', fontSize: '12px', width: '120px' }} />
                    <button className="no-print" style={{ padding: '3px 10px', border: '1px solid #999', backgroundColor: '#e8f4f8', cursor: 'pointer', fontSize: '11px', borderRadius: '3px' }}>🔍</button>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'flex-end' }}>
                    <span style={{ minWidth: '80px', textAlign: 'right' }}>ประเภทราคา</span>
                    <select defaultValue="2" style={{ padding: '4px 8px', border: '1px solid #999', backgroundColor: '#fff', fontSize: '12px', width: '200px' }}>
                      <option value="2">2 - แยก VAT</option>
                      <option value="1">1 - รวม VAT</option>
                    </select>
                  </div>
                </div>

                {/* ปุ่มปิด */}
                <button className="no-print" style={{ position: 'absolute', top: '8px', right: '8px', width: '28px', height: '28px', borderRadius: '50%', border: 'none', backgroundColor: '#d0d0d0', color: '#666', fontSize: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }} onClick={() => setShowDetailModal(false)}>✕</button>
              </div>
            </div>

            {/* ── Items Table ── */}
            <div style={{ backgroundColor: '#fff', margin: '20px', padding: '25px', border: '2px solid #C8A882', borderRadius: '4px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #999', marginBottom: '30px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#EEECE1' }}>
                    {['No.','รหัส','รายละเอียด','จำนวน','หน่วย','ราคา/หน่วย','ส่วนลด','จำนวนเงิน'].map((h, i) => (
                      <th key={i} style={{ padding: '10px 8px', border: '1px solid #999', fontSize: '13px', fontWeight: 'bold', color: '#000', textAlign: 'center' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {selectedOrder.items?.map((item, idx) => (
                    <tr key={idx} style={{ backgroundColor: '#fff' }}>
                      <td style={{ padding: '6px 8px', border: '1px solid #ddd', fontSize: '13px', textAlign: 'center', height: '32px' }}>{idx + 1}</td>
                      <td style={{ padding: '6px 8px', border: '1px solid #ddd', fontSize: '13px', textAlign: 'center', height: '32px' }}>{item.product_id || '-'}</td>
                      <td style={{ padding: '6px 8px', border: '1px solid #ddd', fontSize: '13px', textAlign: 'left', paddingLeft: '10px', height: '32px' }}>{item.product_name || item.name}</td>
                      <td style={{ padding: '6px 8px', border: '1px solid #ddd', fontSize: '13px', textAlign: 'right', paddingRight: '10px', height: '32px' }}>{parseFloat(item.quantity || 0).toLocaleString(undefined, { minimumFractionDigits: 3 })}</td>
                      <td style={{ padding: '6px 8px', border: '1px solid #ddd', fontSize: '13px', textAlign: 'center', height: '32px' }}>{item.unit || item.weight_unit || 'ชิ้น'}</td>
                      <td style={{ padding: '6px 8px', border: '1px solid #ddd', fontSize: '13px', textAlign: 'right', paddingRight: '10px', height: '32px' }}>{parseFloat(item.price_at_time || item.price || 0).toFixed(2)}</td>
                      <td style={{ padding: '6px 8px', border: '1px solid #ddd', fontSize: '13px', textAlign: 'center', height: '32px' }}></td>
                      <td style={{ padding: '6px 8px', border: '1px solid #ddd', fontSize: '13px', textAlign: 'right', paddingRight: '10px', fontWeight: '500', height: '32px' }}>{(parseFloat(item.price_at_time || item.price || 0) * item.quantity).toFixed(2)}</td>
                    </tr>
                  ))}
                  {[...Array(Math.max(0, 15 - (selectedOrder.items?.length || 0)))].map((_, i) => (
                    <tr key={`empty-${i}`}>
                      {[...Array(8)].map((__, j) => <td key={j} style={{ padding: '6px 8px', border: '1px solid #ddd', height: '32px' }}></td>)}
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* QR + Summary */}
              <div style={{ display: 'flex', gap: '15px', marginTop: '12px', alignItems: 'flex-start' }}>
                <div style={{ flex: '0 0 auto', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '8px' }}>
                  <div style={{ padding: '10px', backgroundColor: '#fff', border: '2px solid #C8A882', borderRadius: '4px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                    <img src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=http://192.168.1.113:5173/invoice/${selectedOrder.order_id}`} alt="QR Code" style={{ width: '120px', height: '120px', display: 'block' }} />
                    <div style={{ fontSize: '10px', color: '#666', fontWeight: '600', textAlign: 'center' }}>IV{String(selectedOrder.order_id).padStart(7, '0')}</div>
                  </div>
                  <div style={{ fontSize: '9px', color: '#000', lineHeight: '1.6', maxWidth: '450px', marginTop: '5px' }}>
                    <div style={{ fontWeight: 'bold', marginBottom: '4px', fontSize: '10px' }}>***หมายเหตุ</div>
                    <div style={{ marginBottom: '3px' }}>1. โปรดตรวจสอบจำนวน คุณภาพ รายการในเอกสารนี้ ก่อนลงลายมือชื่อรับสินค้า เมื่อได้ลงลายมือชื่อแล้ว จะถือว่าการส่งมอบสินค้าและการรับสินค้า และเอกสารถูกต้องครบถ้วนแล้ว</div>
                    <div style={{ marginBottom: '3px' }}>2. กรณีสินค้ามีปัญหา ทางบริษัทฯ จะรับคืนสินค้าเมื่อสินค้าอยู่ในสภาพสมบูรณ์เท่านั้น</div>
                    <div>3. เงื่อนไขการเคลมสินค้า ภายใน 14 วันหลังจากวันส่งสินค้า</div>
                  </div>
                </div>

                {/* Summary Box */}
                <div style={{ flex: '1', backgroundColor: '#f0e6d6', border: '2px solid #C8A882', borderRadius: '4px', padding: '10px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <tbody>
                      {[
                        ['รวมมูลค่าสินค้า (Sub Total)',                       totals.subtotal],
                        ['ส่วนลด (Discount)',                                   '0.00% / 0.00'],
                        ['มูลค่าหลังส่วนลด (After discount)',                  totals.subtotal],
                        ['ไม่มี VAT (Non VAT)',                                 '0.00'],
                        ['รวม VAT (Include VAT)',                               totals.subtotal],
                        ['ภาษี 7% (VAT)',                                       totals.vat],
                      ].map(([label, value]) => (
                        <tr key={label}>
                          <td style={{ padding: '4px 8px', fontSize: '11px', color: '#333', borderBottom: '1px solid #ddd' }}>{label}</td>
                          <td style={{ padding: '4px 8px', fontSize: '12px', fontWeight: '700', color: '#000', borderBottom: '1px solid #ddd', textAlign: 'right' }}>{value}</td>
                        </tr>
                      ))}
                      <tr>
                        <td style={{ padding: '8px', fontSize: '12px', fontWeight: 'bold', color: '#000', backgroundColor: '#e8dcc8' }}>รวมทั้งสิ้น<div style={{ fontSize: '10px', fontWeight: 'normal', color: '#666' }}>Net Total</div></td>
                        <td style={{ padding: '8px', fontSize: '16px', fontWeight: 'bold', color: '#d32f2f', backgroundColor: '#e8dcc8', textAlign: 'right' }}>{totals.total}</td>
                      </tr>
                    </tbody>
                  </table>

                  <div style={{ height: '1px', backgroundColor: '#C8A882', margin: '10px 0' }}></div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', alignItems: 'end' }}>
                    <div>
                      <div style={{ fontSize: '11px', fontWeight: 'bold', marginBottom: '5px', color: '#000' }}>จัดส่งสินค้า</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '4px' }}>
                        <input type="checkbox" checked={isCashPayment} onChange={(e) => setIsCashPayment(e.target.checked)} style={{ width: '14px', height: '14px', accentColor: '#8b6f47', cursor: 'pointer' }} />
                        <span style={{ fontSize: '10px', fontWeight: '600' }}>เงินสด</span>
                        <input type="checkbox" checked={isCreditPayment} onChange={(e) => setIsCreditPayment(e.target.checked)} style={{ width: '14px', height: '14px', marginLeft: '6px', accentColor: '#8b6f47', cursor: 'pointer' }} />
                        <span style={{ fontSize: '10px' }}>เงินเชื่อ</span>
                      </div>
                      <div style={{ fontSize: '10px', color: '#666', marginBottom: '5px' }}>การชำระเงิน</div>
                      <div style={{ padding: '6px', backgroundColor: '#fff', border: '1px solid #ddd', borderRadius: '3px', minHeight: '45px' }}>
                        <div style={{ fontSize: '10px', fontWeight: '600', marginBottom: '3px' }}>ผู้ส่งของ</div>
                        <div style={{ fontSize: '9px', color: '#666' }}>วันที่ ___/___/___</div>
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '11px', fontWeight: 'bold', marginBottom: '5px', color: '#000' }}>ลูกค้า</div>
                      <div style={{ padding: '6px', backgroundColor: '#fff', border: '1px solid #ddd', borderRadius: '3px', minHeight: '45px', marginTop: '33px' }}>
                        <div style={{ fontSize: '10px', fontWeight: '600', marginBottom: '3px' }}>ผู้รับของ</div>
                        <div style={{ fontSize: '9px', color: '#666' }}>วันที่ ___/___/___</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Admin Actions */}
              <div className="no-print" style={{ marginTop: '30px', paddingTop: '20px', borderTop: '2px solid #ddd', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px', fontSize: '14px' }}>
                  <strong>สถานะรายการ:</strong>
                  <select value={selectedOrder.status} onChange={(e) => updateOrderStatus(selectedOrder.order_id, e.target.value)} style={{ padding: '10px 15px', border: '1px solid #999', borderRadius: '4px', backgroundColor: '#fff', fontSize: '14px', outline: 'none', minWidth: '200px', cursor: 'pointer' }}>
                    <option value="pending">⏳ รอชำระเงิน</option>
                    <option value="paid">✅ ชำระแล้ว</option>
                    <option value="shipped">🚚 จัดส่งแล้ว</option>
                    <option value="completed">✔️ สำเร็จ</option>
                    <option value="cancelled">❌ ยกเลิก</option>
                  </select>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button onClick={() => window.print()} style={{ padding: '12px 25px', backgroundColor: '#2196f3', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: '600', boxShadow: '0 2px 6px rgba(33,150,243,0.3)' }}>🖨️ พิมพ์</button>
                  <button onClick={() => deleteOrder(selectedOrder.order_id)} style={{ padding: '12px 25px', backgroundColor: '#d32f2f', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: '600', boxShadow: '0 2px 6px rgba(211,47,47,0.3)' }}>🗑️ ลบรายการนี้</button>
                  <button onClick={() => setShowDetailModal(false)} style={{ padding: '12px 25px', backgroundColor: '#616161', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: '600' }}>ปิดหน้าต่าง</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const printStyle = document.createElement('style');
printStyle.textContent = `
  @page { size: A4 portrait; margin: 8mm 10mm; }
  @media print {
    body * { visibility: hidden; }
    .print-modal-overlay, .print-modal-overlay * { visibility: visible !important; }
    .no-print, button.no-print { display: none !important; visibility: hidden !important; }
    .print-modal-overlay { position: fixed !important; top: 0 !important; left: 0 !important; width: 100vw !important; height: 100vh !important; background: white !important; padding: 0 !important; margin: 0 !important; overflow: visible !important; display: block !important; }
    .print-modal-content { position: relative !important; width: 100% !important; max-width: 100% !important; height: auto !important; max-height: none !important; box-shadow: none !important; background: #F5E6D3 !important; border: none !important; border-radius: 0 !important; padding: 12px !important; margin: 0 !important; overflow: visible !important; }
    table { width: 100% !important; border-collapse: collapse !important; border: 1px solid #999 !important; }
    thead { display: table-header-group !important; background: #EEECE1 !important; }
    tr { page-break-inside: avoid !important; }
    th, td { border: 1px solid #999 !important; padding: 6px 5px !important; font-size: 11px !important; color: #000 !important; }
    th { background: #EEECE1 !important; font-weight: bold !important; text-align: center !important; }
    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  }
  @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
`;
document.head.appendChild(printStyle);

export default Orders;