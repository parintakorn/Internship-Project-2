import { useState, useEffect, useContext, useCallback } from 'react';
import { AuthContext } from '../../context/AuthContext';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useNavigate } from 'react-router-dom';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const authHeaders = () => {
  const token = localStorage.getItem('token') || '';
  return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
};

const apiFetch = async (url, opts = {}) => {
  const res = await fetch(`${API_BASE}${url}`, { headers: authHeaders(), ...opts });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || err.message || `HTTP ${res.status}`);
  }
  return res.json();
};

const getDaysColor = (days) => {
  if (days <= 1) return '#10b981';
  if (days <= 3) return '#f59e0b';
  return '#ef4444';
};
const fmtNum = (n, d = 2) => Number(n || 0).toLocaleString('th-TH', { maximumFractionDigits: d });

// ─── Export helpers ───────────────────────────────────────────
const exportInventoryExcel = (data) => {
  const rows = data.map(item => ({
    'รหัส': item.code, 'ชื่อวัตถุดิบ': item.name, 'หมวดหมู่': item.category,
    'น้ำหนัก (ก.)': item.weight, 'วันที่รับเข้า': item.receive_date,
    'วันในคลัง': item.days_in_stock, 'สถานะ': 'มีในคลัง',
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'คลังวัตถุดิบ');
  XLSX.writeFile(wb, `inventory_${new Date().toISOString().slice(0,10)}.xlsx`);
};

const exportWithdrawalsExcel = (data) => {
  const rows = data.map(w => ({
    'รหัสคลัง': w.code, 'ชื่อวัตถุดิบ': w.name, 'หมวดหมู่': w.category,
    'น้ำหนักที่เบิก (ก.)': w.amount, 'วันที่เบิก': w.withdraw_date,
    'เหตุผล': w.reason || '-', 'เบิกไปแล้ว (วัน)': w.days_ago,
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'ประวัติการเบิก');
  XLSX.writeFile(wb, `withdrawals_${new Date().toISOString().slice(0,10)}.xlsx`);
};

const exportMovementExcel = (received, withdrawn) => {
  const rows = [
    ...received.map(r => ({ 'ประเภท': 'รับเข้า', 'รหัส': r.code, 'ชื่อ': r.name, 'หมวดหมู่': r.category, 'น้ำหนัก (ก.)': r.original_weight ?? r.weight, 'เหตุผล': '-', 'วันที่': r.receive_date })),
    ...withdrawn.map(w => ({ 'ประเภท': 'เบิกออก', 'รหัส': w.code, 'ชื่อ': w.name, 'หมวดหมู่': w.category, 'น้ำหนัก (ก.)': w.amount, 'เหตุผล': w.reason || '-', 'วันที่': w.withdraw_date })),
  ].sort((a, b) => new Date(b['วันที่']) - new Date(a['วันที่']));
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'ความเคลื่อนไหว');
  XLSX.writeFile(wb, `movements_${new Date().toISOString().slice(0,10)}.xlsx`);
};

const exportInventoryPDF = (data) => {
  const doc = new jsPDF({ orientation: 'landscape' });
  doc.setFontSize(14);
  doc.text('รายงานวัตถุดิบในคลัง', 14, 15);
  doc.setFontSize(9);
  doc.text(`วันที่ออกรายงาน: ${new Date().toLocaleDateString('th-TH')}`, 14, 22);
  autoTable(doc, {
    startY: 27,
    head: [['รหัส','ชื่อวัตถุดิบ','หมวดหมู่','น้ำหนัก (ก.)','วันที่รับเข้า','วันในคลัง','สถานะ']],
    body: data.map(item => [item.code, item.name, item.category, item.weight, item.receive_date, item.days_in_stock + ' วัน', 'มีในคลัง']),
    styles: { font: 'helvetica', fontSize: 8 },
    headStyles: { fillColor: [30, 41, 59] },
    alternateRowStyles: { fillColor: [249, 250, 251] },
  });
  doc.save(`inventory_${new Date().toISOString().slice(0,10)}.pdf`);
};

const exportWithdrawalsPDF = (data) => {
  const doc = new jsPDF({ orientation: 'landscape' });
  doc.setFontSize(14);
  doc.text('รายงานประวัติการเบิกวัตถุดิบ', 14, 15);
  doc.setFontSize(9);
  doc.text(`วันที่ออกรายงาน: ${new Date().toLocaleDateString('th-TH')}`, 14, 22);
  autoTable(doc, {
    startY: 27,
    head: [['รหัสคลัง','ชื่อวัตถุดิบ','หมวดหมู่','น้ำหนักที่เบิก (ก.)','วันที่เบิก','เหตุผล','เบิกไปแล้ว (วัน)']],
    body: data.map(w => [w.code, w.name, w.category, w.amount, w.withdraw_date, w.reason || '-', w.days_ago + ' วัน']),
    styles: { font: 'helvetica', fontSize: 8 },
    headStyles: { fillColor: [30, 41, 59] },
    alternateRowStyles: { fillColor: [249, 250, 251] },
  });
  doc.save(`withdrawals_${new Date().toISOString().slice(0,10)}.pdf`);
};

// ─── SVG Bar Chart ────────────────────────────────────────────
const BarChart = ({ data, height = 180 }) => {
  if (!data?.length)
    return <div style={{ textAlign: 'center', padding: 32, color: '#bbb' }}>ไม่มีข้อมูล</div>;
  const maxVal = Math.max(...data.flatMap(d => [Number(d.received_g), Number(d.withdrawn_g)]), 1);
  const barW = 44, gap = 8;
  const totalW = data.length * (barW * 2 + gap * 3) + 40;
  return (
    <div style={{ overflowX: 'auto' }}>
      <svg width={totalW} height={height + 52} style={{ fontFamily: 'sans-serif', display: 'block' }}>
        {data.map((d, i) => {
          const x  = 20 + i * (barW * 2 + gap * 3);
          const rH = (Number(d.received_g)  / maxVal) * height;
          const wH = (Number(d.withdrawn_g) / maxVal) * height;
          return (
            <g key={d.month || i}>
              <rect x={x}              y={height - rH} width={barW} height={rH} fill="#3b82f6" rx={3} opacity={0.85} />
              <rect x={x + barW + gap} y={height - wH} width={barW} height={wH} fill="#ef4444" rx={3} opacity={0.85} />
              {rH > 18 && <text x={x + barW / 2} y={height - rH + 13} textAnchor="middle" fontSize={9} fill="#fff" fontWeight="bold">{Math.round(d.received_g / 1000)}k</text>}
              {wH > 18 && <text x={x + barW + gap + barW / 2} y={height - wH + 13} textAnchor="middle" fontSize={9} fill="#fff" fontWeight="bold">{Math.round(d.withdrawn_g / 1000)}k</text>}
              <text x={x + barW + gap / 2} y={height + 18} textAnchor="middle" fontSize={10} fill="#888">{(d.label || d.month || '').slice(0, 8)}</text>
            </g>
          );
        })}
        <rect x={20}  y={height + 32} width={11} height={11} fill="#3b82f6" rx={2} />
        <text x={35}  y={height + 42} fontSize={11} fill="#666">รับเข้า (กรัม)</text>
        <rect x={130} y={height + 32} width={11} height={11} fill="#ef4444" rx={2} />
        <text x={145} y={height + 42} fontSize={11} fill="#666">เบิกออก (กรัม)</text>
      </svg>
    </div>
  );
};

// ─── SVG Donut Chart ──────────────────────────────────────────
const DonutChart = ({ data }) => {
  if (!data?.length) return null;
  const total = data.reduce((s, d) => s + Number(d.weight_g), 0);
  if (!total) return <div style={{ textAlign: 'center', color: '#bbb' }}>ไม่มีสต็อก</div>;
  const COLORS = ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#06b6d4'];
  const R = 60, cx = 80, cy = 80;
  let cum = -Math.PI / 2;
  const slices = data.map((d, i) => {
    const angle = (Number(d.weight_g) / total) * 2 * Math.PI;
    const x1 = cx + R * Math.cos(cum); const y1 = cy + R * Math.sin(cum);
    cum += angle;
    const x2 = cx + R * Math.cos(cum); const y2 = cy + R * Math.sin(cum);
    return { path: `M${cx} ${cy} L${x1} ${y1} A${R} ${R} 0 ${angle > Math.PI ? 1 : 0} 1 ${x2} ${y2}Z`, color: COLORS[i % COLORS.length], label: d.category, val: d.weight_g };
  });
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
      <svg width={160} height={160}>
        {slices.map((sl, i) => <path key={i} d={sl.path} fill={sl.color} opacity={0.87} stroke="#fff" strokeWidth={1.5} />)}
        <circle cx={cx} cy={cy} r={32} fill="white" />
        <text x={cx} y={cy + 5} textAnchor="middle" fontSize={10} fill="#555">สต็อก</text>
      </svg>
      <div>
        {slices.map((sl, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6, fontSize: 13 }}>
            <div style={{ width: 12, height: 12, borderRadius: 3, background: sl.color, flexShrink: 0 }} />
            <span style={{ color: '#444' }}>{sl.label}</span>
            <span style={{ color: '#999', marginLeft: 4 }}>{fmtNum(sl.val / 1000, 1)} kg</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Timeline Component ───────────────────────────────────────
const Timeline = ({ items }) => {
  if (!items.length) return (
    <div style={{ textAlign: 'center', padding: '2.5rem', color: '#ccc' }}>
      <div style={{ fontSize: 36, marginBottom: 8 }}>📭</div>
      <p style={{ margin: 0 }}>ไม่มีรายการความเคลื่อนไหว</p>
    </div>
  );
  const fmtDate = (str) => {
    if (!str) return '';
    try { return new Date(str).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' }); } catch { return str; }
  };
  return (
    <div style={{ position: 'relative', paddingLeft: 4 }}>
      {items.map((item, i) => {
        const isIn = item.type === 'receive';
        // ── FIX: ใช้ original_weight สำหรับรับเข้า ──
        const displayWeight = isIn ? (item.original_weight ?? item.weight) : item.amount;
        return (
          <div key={i} style={{ display: 'flex', gap: 14, position: 'relative', marginBottom: 12 }}>
            {i < items.length - 1 && (
              <div style={{ position: 'absolute', left: 19, top: 42, width: 2, height: '100%', background: '#e5e7eb', zIndex: 0 }} />
            )}
            <div style={{ flexShrink: 0, width: 40, height: 40, borderRadius: '50%', background: isIn ? '#dbeafe' : '#fee2e2', border: `2px solid ${isIn ? '#3b82f6' : '#ef4444'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, zIndex: 1, marginTop: 2 }}>
              {isIn ? '📥' : '📤'}
            </div>
            <div style={{ flex: 1, background: isIn ? '#fafcff' : '#fffafa', borderRadius: 10, padding: '10px 14px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: `1px solid ${isIn ? '#bfdbfe' : '#fecaca'}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 800, fontSize: 14, color: '#1a1a2e' }}>{item.name}</span>
                  <span style={{ fontSize: 11, background: '#e0f2fe', color: '#0369a1', borderRadius: 20, padding: '2px 8px', fontWeight: 700 }}>{item.category}</span>
                  <span style={{ fontSize: 11, background: isIn ? '#dbeafe' : '#fee2e2', color: isIn ? '#1d4ed8' : '#dc2626', borderRadius: 20, padding: '2px 8px', fontWeight: 700 }}>
                    {isIn ? '📥 รับเข้า' : '📤 เบิกออก'}
                  </span>
                </div>
                <span style={{ fontSize: 11, color: '#bbb' }}>{fmtDate(item.receive_date || item.withdraw_date)}</span>
              </div>
              <div style={{ display: 'flex', gap: 16, marginTop: 7, flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ fontSize: 11, color: '#aaa' }}>รหัส: <span style={{ fontFamily: 'monospace', color: '#6c63ff', fontWeight: 700 }}>{item.code}</span></span>
                <span style={{ fontSize: 15, fontWeight: 800, color: isIn ? '#3b82f6' : '#ef4444' }}>
                  {isIn ? '+' : '-'}{fmtNum(displayWeight)} ก.
                  <span style={{ fontSize: 11, color: '#aaa', fontWeight: 400, marginLeft: 4 }}>({fmtNum(displayWeight / 1000, 3)} kg)</span>
                </span>
                {item.reason && (
                  <span style={{ fontSize: 12, color: '#888', fontStyle: 'italic' }}>💬 {item.reason}</span>
                )}
                {isIn && item.days_in_stock !== undefined && (
                  <span style={{ fontSize: 11, color: getDaysColor(item.days_in_stock) }}>🕐 {item.days_in_stock} วันในคลัง</span>
                )}
                {!isIn && item.days_ago !== undefined && (
                  <span style={{ fontSize: 11, color: '#aaa' }}>⏱ เบิกไป {item.days_ago} วัน</span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ─── Withdraw Modal ───────────────────────────────────────────
const WithdrawModal = ({ open, item, onClose, onSuccess, showToast }) => {
  const [amount, setAmount]   = useState('');
  const [reason, setReason]   = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (open) { setAmount(''); setReason(''); } }, [open]);

  if (!open || !item) return null;

  const handleSubmit = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0)      return showToast('กรุณาระบุจำนวนที่ถูกต้อง', 'error');
    if (amt > item.weight)     return showToast(`เกินน้ำหนักที่มี (${item.weight} ก.)`, 'error');
    setLoading(true);
    try {
      const data = await apiFetch('/api/admin/warehouse/withdraw', {
        method: 'POST',
        body: JSON.stringify({ id: item.id, amount: amt, reason }),
      });
      showToast(data.message || 'เบิกวัตถุดิบสำเร็จ');
      onSuccess();
      onClose();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 4000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: 'white', borderRadius: 16, padding: '28px 24px', maxWidth: 420, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
        <h3 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 800, color: '#1a1a2e' }}>📤 เบิกวัตถุดิบ</h3>
        <p style={{ margin: '0 0 20px', color: '#999', fontSize: 13 }}>รหัส: <strong style={{ color: '#6c63ff', fontFamily: 'monospace' }}>{item.code}</strong></p>
        <div style={{ background: '#f8fafc', borderRadius: 10, padding: '12px 14px', marginBottom: 18, fontSize: 13 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div><span style={{ color: '#aaa' }}>ชื่อ:</span> <strong>{item.name}</strong></div>
            <div><span style={{ color: '#aaa' }}>หมวด:</span> <strong>{item.category}</strong></div>
            <div><span style={{ color: '#aaa' }}>น้ำหนักคงเหลือ:</span> <strong style={{ color: '#10b981' }}>{fmtNum(item.weight)} ก.</strong></div>
            <div><span style={{ color: '#aaa' }}>รับเข้าวันที่:</span> <strong>{item.receive_date}</strong></div>
          </div>
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#555', marginBottom: 6 }}>จำนวนที่เบิก (กรัม) <span style={{ color: '#ef4444' }}>*</span></label>
          <input type="number" min="0.01" max={item.weight} step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder={`สูงสุด ${item.weight} ก.`}
            style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #ddd', borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
        </div>
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#555', marginBottom: 6 }}>เหตุผล (ถ้ามี)</label>
          <textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="เช่น ใช้ผลิตสินค้า, ส่งตรวจ..." rows={3}
            style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #ddd', borderRadius: 8, fontSize: 13, outline: 'none', resize: 'vertical', boxSizing: 'border-box' }} />
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={handleSubmit} disabled={loading}
            style={{ flex: 1, padding: '12px 0', background: loading ? '#aaa' : '#ef4444', color: 'white', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 15, cursor: loading ? 'not-allowed' : 'pointer' }}>
            {loading ? '⏳ กำลังเบิก...' : '📤 ยืนยันเบิก'}
          </button>
          <button onClick={onClose} disabled={loading}
            style={{ flex: 1, padding: '12px 0', background: '#f3f4f6', color: '#555', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>
            ยกเลิก
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Confirm Modal ────────────────────────────────────────────
const ConfirmModal = ({ open, title, message, onConfirm, onCancel, confirmLabel, confirmColor }) => {
  if (!open) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: 'white', borderRadius: 16, padding: '32px 28px', maxWidth: 380, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.25)', textAlign: 'center' }}>
        <div style={{ fontSize: 44, marginBottom: 14 }}>⚠️</div>
        <h3 style={{ margin: '0 0 10px', color: '#1a1a2e', fontSize: 18 }}>{title}</h3>
        <p style={{ margin: '0 0 24px', color: '#666', fontSize: 14, lineHeight: 1.6 }}>{message}</p>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onConfirm} style={{ flex: 1, padding: '12px 0', background: confirmColor || '#ef4444', color: 'white', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>{confirmLabel || 'ยืนยัน'}</button>
          <button onClick={onCancel}  style={{ flex: 1, padding: '12px 0', background: '#f3f4f6', color: '#555', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>ยกเลิก</button>
        </div>
      </div>
    </div>
  );
};

// ─── Toast ────────────────────────────────────────────────────
const Toast = ({ msg, type }) => {
  if (!msg) return null;
  return (
    <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999, background: type === 'error' ? '#ef4444' : '#10b981', color: 'white', borderRadius: 10, padding: '12px 20px', fontWeight: 700, boxShadow: '0 8px 24px rgba(0,0,0,0.2)', animation: 'slideIn .3s ease' }}>
      {type === 'error' ? '⚠️' : '✅'} {msg}
    </div>
  );
};

// ─── Stat Card ────────────────────────────────────────────────
const StatCard = ({ color, icon, label, value, sub }) => (
  <div
    style={{ backgroundColor: 'white', borderRadius: 12, padding: '1.25rem', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', borderLeft: `5px solid ${color}`, transition: 'transform .2s', cursor: 'default' }}
    onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
    onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
  >
    <div style={{ fontSize: '1.75rem', marginBottom: 6 }}>{icon}</div>
    <div style={{ fontSize: '0.78rem', color: '#aaa', fontWeight: 700, letterSpacing: '0.06em', marginBottom: 4, textTransform: 'uppercase' }}>{label}</div>
    <div style={{ fontSize: '1.7rem', fontWeight: 800, color }}>{value}</div>
    <div style={{ fontSize: '0.72rem', color: '#ccc', marginTop: 3 }}>{sub}</div>
  </div>
);

// ─── MAIN ─────────────────────────────────────────────────────
const WarehouseDashboard = () => {
  const { token } = useContext(AuthContext);
  const navigate = useNavigate();

  const [stats,       setStats]       = useState(null);
  const [inventory,   setInventory]   = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [monthlyData, setMonthlyData] = useState([]);
  const [stockByCat,  setStockByCat]  = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [activeTab,   setActiveTab]   = useState('movement');
  const [search,      setSearch]      = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [filterType,    setFilterType]    = useState('all');
  const [selectedDate,  setSelectedDate]  = useState(new Date().toISOString().slice(0, 10));
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [selectedYear,  setSelectedYear]  = useState(String(new Date().getFullYear()));
  const [confirm,       setConfirm]       = useState({ open: false, type: null, id: null, name: '' });
  const [toast,         setToast]         = useState({ msg: '', type: 'success' });
  const [withdrawModal, setWithdrawModal] = useState({ open: false, item: null });

  const [movFilter, setMovFilter] = useState('all');
  const [movSearch, setMovSearch] = useState('');

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg: '' }), 3500);
  };

  const buildQS = useCallback(() => {
    const p = new URLSearchParams();
    if (filterType !== 'all') p.set('filter', filterType);
    if (filterType === 'daily')   p.set('date',  selectedDate);
    if (filterType === 'monthly') p.set('month', selectedMonth);
    if (filterType === 'yearly')  p.set('year',  selectedYear);
    if (categoryFilter !== 'all') p.set('category', categoryFilter);
    return p.toString() ? '?' + p.toString() : '';
  }, [filterType, selectedDate, selectedMonth, selectedYear, categoryFilter]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const qs = buildQS();
    try {
      const [sR, iR, wR, mR, cR] = await Promise.all([
        fetch(`${API_BASE}/api/admin/warehouse/stats${qs}`,               { headers: authHeaders() }),
        fetch(`${API_BASE}/api/admin/warehouse/inventory${qs}`,           { headers: authHeaders() }),
        fetch(`${API_BASE}/api/admin/warehouse/withdrawals${qs}`,         { headers: authHeaders() }),
        fetch(`${API_BASE}/api/admin/warehouse/report/monthly`,           { headers: authHeaders() }),
        fetch(`${API_BASE}/api/admin/warehouse/report/stock-by-category`, { headers: authHeaders() }),
      ]);
      if (sR.ok) { const d = await sR.json(); if (d.success) setStats(d.stats); }
      if (iR.ok) { const d = await iR.json(); setInventory(d.success ? d.inventory : []); }
      if (wR.ok) { const d = await wR.json(); setWithdrawals(d.success ? d.withdrawals : []); }
      if (mR.ok) { const d = await mR.json(); if (d.success) setMonthlyData(d.data); }
      if (cR.ok) { const d = await cR.json(); if (d.success) setStockByCat(d.data); }
    } catch (err) {
      showToast('โหลดข้อมูลไม่สำเร็จ: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [buildQS]);

  useEffect(() => { fetchAll(); }, [token, fetchAll]);

  const openConfirm = (id, name, type) => setConfirm({ open: true, type, id, name });

  const handleConfirm = async () => {
    const { type, id } = confirm;
    setConfirm(c => ({ ...c, open: false }));
    try {
      let url;
      if (type === 'undo')              url = `/api/admin/warehouse/withdrawal/${id}/undo`;
      else if (type === 'delwithdraw')  url = `/api/admin/warehouse/withdrawals/${id}`;
      else if (type === 'delinventory') url = `/api/admin/warehouse/inventory/${id}`;
      const data = await apiFetch(url, { method: 'DELETE' });
      showToast(data.message || 'สำเร็จ');
      fetchAll();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleViewReport = () => {
    if (filterType === 'all') { fetchAll(); return; }
    if (filterType === 'daily')   navigate(`/admin/warehouse/report/daily?date=${selectedDate}`);
    if (filterType === 'monthly') navigate(`/admin/warehouse/report/monthly?month=${selectedMonth}`);
    if (filterType === 'yearly')  navigate(`/admin/warehouse/report/yearly?year=${selectedYear}`);
  };

  const categories = ['all', ...new Set(inventory.map(i => i.category).filter(Boolean))];

  const filteredInventory = inventory.filter(item => {
    const matchS = (item.name || '').toLowerCase().includes(search.toLowerCase()) ||
                   (item.code || '').toLowerCase().includes(search.toLowerCase());
    const matchC = categoryFilter === 'all' || item.category === categoryFilter;
    return matchS && matchC;
  });

  const allMovements = [
    ...inventory.map(r  => ({ ...r,  type: 'receive'  })),
    ...withdrawals.map(w => ({ ...w,  type: 'withdraw' })),
  ].sort((a, b) => new Date(b.receive_date || b.withdraw_date || 0) - new Date(a.receive_date || a.withdraw_date || 0));

  const filteredMovements = allMovements.filter(m => {
    const matchT = movFilter === 'all' || m.type === movFilter;
    const q = movSearch.toLowerCase();
    const matchS = !q || (m.name || '').toLowerCase().includes(q) || (m.code || '').toLowerCase().includes(q);
    return matchT && matchS;
  });

  // ── FIX: คำนวณรับเข้ารวมที่ถูกต้อง = weight คงเหลือ + เบิกออกทั้งหมด ──
  const totalReceivedKg = (
    inventory.reduce((s, i) => s + Number(i.weight || 0), 0) +
    withdrawals.reduce((s, w) => s + Number(w.amount || 0), 0)
  ) / 1000;

  const totalWithdrawnKg = withdrawals.reduce((s, w) => s + Number(w.amount || 0), 0) / 1000;

  const ftab = (v) => ({
    padding: '8px 16px', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 13,
    background: filterType === v ? '#3b82f6' : '#f3f4f6',
    color:      filterType === v ? 'white'   : '#666',
    transition: 'all .2s',
  });

  const tabStyle = (v) => ({
    padding: '0.75rem 1.25rem', backgroundColor: 'transparent', border: 'none',
    borderBottom: `3px solid ${activeTab === v ? '#3b82f6' : 'transparent'}`,
    marginBottom: '-2px', fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer',
    color: activeTab === v ? '#3b82f6' : '#666', transition: 'all 0.2s', whiteSpace: 'nowrap',
  });

  if (loading && !stats)
    return <div style={{ textAlign: 'center', padding: '4rem', fontSize: '1.1rem', color: '#888' }}>⏳ กำลังโหลดข้อมูลคลัง...</div>;

  return (
    <div style={{ padding: '1.5rem', backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
      <style>{`@keyframes slideIn { from { transform: translateX(50px); opacity:0 } to { transform: none; opacity:1 } }`}</style>

      <Toast msg={toast.msg} type={toast.type} />

      <ConfirmModal
        open={confirm.open}
        title={confirm.type === 'undo' ? '↩️ ยกเลิกการเบิก (Undo)' : confirm.type === 'delinventory' ? '🗑️ ลบรายการคลัง' : '🗑️ ลบประวัติการเบิก'}
        message={
          confirm.type === 'undo' ? `ยืนยันยกเลิกการเบิก "${confirm.name}" และคืนสินค้ากลับคลัง?`
          : confirm.type === 'delinventory' ? `ยืนยันลบรายการ "${confirm.name}" ออกจากคลังถาวร?\nการดำเนินการนี้ไม่สามารถย้อนกลับได้`
          : `ยืนยันลบประวัติการเบิก "${confirm.name}"?\n(สินค้าจะยังคงเป็น WITHDRAWN)`
        }
        confirmLabel={confirm.type === 'undo' ? '↩️ ยกเลิกการเบิก' : confirm.type === 'delinventory' ? '🗑️ ลบออกจากคลัง' : '🗑️ ลบประวัติ'}
        confirmColor={confirm.type === 'undo' ? '#f59e0b' : '#ef4444'}
        onConfirm={handleConfirm}
        onCancel={() => setConfirm(c => ({ ...c, open: false }))}
      />

      <WithdrawModal
        open={withdrawModal.open} item={withdrawModal.item}
        onClose={() => setWithdrawModal({ open: false, item: null })}
        onSuccess={fetchAll} showToast={showToast}
      />

      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#1a1a2e', margin: 0 }}>📦 คลังวัตถุดิบ</h1>
          <p style={{ color: '#999', margin: '0.25rem 0 0', fontSize: '0.9rem' }}>สรุปสถานะและรายงานคลังวัตถุดิบ</p>
        </div>
        <button onClick={fetchAll} style={{ padding: '0.6rem 1.4rem', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: 9, fontWeight: 700, cursor: 'pointer' }}>
          🔄 รีเฟรช
        </button>
      </div>

      {/* FILTER */}
      <div style={{ background: 'white', borderRadius: 12, padding: '1rem 1.25rem', marginBottom: '1.25rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <div style={{ fontSize: '0.75rem', color: '#aaa', fontWeight: 700, marginBottom: 10, letterSpacing: '0.07em', textTransform: 'uppercase' }}>🔍 กรองช่วงเวลา</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          {[['📅 ทั้งหมด','all'],['📆 รายวัน','daily'],['📊 รายเดือน','monthly'],['📈 รายปี','yearly']].map(([label, val]) => (
            <button key={val} onClick={() => setFilterType(val)} style={ftab(val)}>{label}</button>
          ))}
          {filterType === 'daily'   && <input type="date"  value={selectedDate}  onChange={e => setSelectedDate(e.target.value)}  style={s.fi} />}
          {filterType === 'monthly' && <input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} style={s.fi} />}
          {filterType === 'yearly'  && (
            <select value={selectedYear} onChange={e => setSelectedYear(e.target.value)} style={s.fi}>
              {Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - i).map(y => (
                <option key={y} value={y}>{y + 543}</option>
              ))}
            </select>
          )}
          <button onClick={handleViewReport} style={{ padding: '8px 16px', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 13, background: '#f59e0b', color: 'white' }}>
            🔍 ดูรายงาน
          </button>
        </div>
      </div>

      {/* STAT CARDS */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          <StatCard color="#3b82f6" icon="🗂️" label="ชนิดวัตถุดิบ"    value={fmtNum(stats.total_products, 0)}         sub="ชนิด" />
          <StatCard color="#10b981" icon="✅" label="รายการในคลัง"     value={fmtNum(stats.in_stock, 0)}              sub="รายการ" />
          <StatCard color="#f59e0b" icon="⚖️" label="น้ำหนักรวม"       value={fmtNum(stats.total_weight_g / 1000)}     sub="กิโลกรัม" />
          <StatCard color="#ef4444" icon="📤" label="เบิกออก (Filter)" value={fmtNum(stats.total_withdrawn_g / 1000)} sub="กิโลกรัม" />
          <StatCard color="#8b5cf6" icon="📋" label="เบิกวันนี้"       value={fmtNum(stats.today_withdrawals, 0)}     sub="รายการ" />
          <StatCard color="#06b6d4" icon="💰" label="มูลค่าคงเหลือ"    value={fmtNum(stats.total_value, 0)}           sub="บาท" />
        </div>
      )}

      {/* REPORT CHARTS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ background: 'white', borderRadius: 12, padding: '1.25rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <h3 style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: 700, color: '#1a1a2e' }}>📊 รับเข้า vs เบิกออก (6 เดือน)</h3>
          <BarChart data={monthlyData} />
        </div>
        <div style={{ background: 'white', borderRadius: 12, padding: '1.25rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <h3 style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: 700, color: '#1a1a2e' }}>🥧 สต็อกแยกหมวดหมู่</h3>
          <DonutChart data={stockByCat} />
        </div>
        <div style={{ background: 'white', borderRadius: 12, padding: '1.25rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <h3 style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: 700, color: '#1a1a2e' }}>📋 สรุปต่อหมวดหมู่</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                {['หมวดหมู่','รายการ (ชิ้น)','น้ำหนัก (kg)'].map(h => (
                  <th key={h} style={{ padding: '8px 12px', textAlign: h === 'หมวดหมู่' ? 'left' : 'right', color: '#999', fontWeight: 700, borderBottom: '1px solid #e5e7eb', fontSize: 12 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {stockByCat.map((d, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f5f5f5' }}>
                  <td style={{ padding: '9px 12px' }}><span style={{ background: '#e0f2fe', color: '#0369a1', padding: '2px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>{d.category}</span></td>
                  <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 700, color: '#333' }}>{d.items_in_stock}</td>
                  <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 700, color: '#10b981' }}>{fmtNum(d.weight_g / 1000)}</td>
                </tr>
              ))}
              {!stockByCat.length && <tr><td colSpan={3} style={{ padding: 20, textAlign: 'center', color: '#ddd', fontStyle: 'italic' }}>ไม่มีข้อมูล</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── TABS ── */}
      <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '1rem', borderBottom: '2px solid #e5e7eb', overflowX: 'auto' }}>
        <button style={tabStyle('movement')}    onClick={() => setActiveTab('movement')}>🔄 ความเคลื่อนไหว ({allMovements.length})</button>
        <button style={tabStyle('inventory')}   onClick={() => setActiveTab('inventory')}>📋 วัตถุดิบในคลัง ({inventory.length})</button>
        <button style={tabStyle('withdrawals')} onClick={() => setActiveTab('withdrawals')}>📤 ประวัติการเบิก ({withdrawals.length})</button>
      </div>

      {/* ── TAB: ความเคลื่อนไหว ── */}
      {activeTab === 'movement' && (
        <div>
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <input type="text" placeholder="🔍 ค้นหาชื่อหรือรหัส..." value={movSearch} onChange={e => setMovSearch(e.target.value)} style={s.searchInput} />
            {[['ทั้งหมด','all'],['📥 รับเข้า','receive'],['📤 เบิกออก','withdraw']].map(([label, val]) => (
              <button key={val} onClick={() => setMovFilter(val)} style={{ padding: '8px 14px', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 12, background: movFilter === val ? '#3b82f6' : '#f3f4f6', color: movFilter === val ? 'white' : '#666' }}>
                {label}
              </button>
            ))}
            <button onClick={() => exportMovementExcel(inventory, withdrawals)} style={s.exportBtn('#10b981')}>📥 Excel</button>
            <span style={{ fontSize: 12, color: '#aaa', marginLeft: 'auto' }}>{filteredMovements.length} รายการ</span>
          </div>

          {/* ── FIX: Summary bar ใช้ totalReceivedKg ที่คำนวณถูกต้อง ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
            <div style={{ background: 'white', borderRadius: 10, padding: '0.85rem 1rem', borderLeft: '4px solid #3b82f6', boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
              <div style={{ fontSize: 11, color: '#aaa', fontWeight: 700, textTransform: 'uppercase' }}>รับเข้ารวม</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#3b82f6', marginTop: 2 }}>+{fmtNum(totalReceivedKg, 2)} kg</div>
            </div>
            <div style={{ background: 'white', borderRadius: 10, padding: '0.85rem 1rem', borderLeft: '4px solid #ef4444', boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
              <div style={{ fontSize: 11, color: '#aaa', fontWeight: 700, textTransform: 'uppercase' }}>เบิกออกรวม</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#ef4444', marginTop: 2 }}>-{fmtNum(totalWithdrawnKg, 2)} kg</div>
            </div>
            <div style={{ background: 'white', borderRadius: 10, padding: '0.85rem 1rem', borderLeft: '4px solid #10b981', boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
              <div style={{ fontSize: 11, color: '#aaa', fontWeight: 700, textTransform: 'uppercase' }}>ความเคลื่อนไหว</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#10b981', marginTop: 2 }}>{allMovements.length} รายการ</div>
            </div>
          </div>

          <div style={{ background: 'white', borderRadius: 12, padding: '1.25rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <Timeline items={filteredMovements} />
          </div>
        </div>
      )}

      {/* ── TAB: วัตถุดิบในคลัง ── */}
      {activeTab === 'inventory' && (
        <div>
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <input type="text" placeholder="🔍 ค้นหาชื่อหรือรหัส..." value={search} onChange={e => setSearch(e.target.value)} style={s.searchInput} />
            <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} style={s.select}>
              {categories.map(c => <option key={c} value={c}>{c === 'all' ? '📋 ทุกหมวดหมู่' : c}</option>)}
            </select>
            <button onClick={() => exportInventoryExcel(filteredInventory)} style={s.exportBtn('#10b981')}>📥 Excel</button>
            <button onClick={() => exportInventoryPDF(filteredInventory)}   style={s.exportBtn('#ef4444')}>📄 PDF</button>
          </div>
          <div style={s.tableWrapper}>
            <table style={s.table}>
              <thead>
                <tr style={s.thead}>
                  {['รหัส','ชื่อวัตถุดิบ','หมวดหมู่','น้ำหนัก (ก.)','วันที่รับเข้า','วันในคลัง','สถานะ','จัดการ'].map(h => <th key={h} style={s.th}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {filteredInventory.length === 0
                  ? <tr><td colSpan={8} style={s.empty}>ไม่พบข้อมูลในคลัง</td></tr>
                  : filteredInventory.map((item, i) => (
                    <tr key={item.id || i} style={i % 2 === 0 ? s.trEven : s.trOdd}>
                      <td style={s.td}><strong style={{ fontFamily: 'monospace', color: '#6c63ff' }}>{item.code}</strong></td>
                      <td style={s.td}>{item.name}</td>
                      <td style={s.td}><span style={s.badge}>{item.category}</span></td>
                      <td style={{ ...s.td, textAlign: 'right', fontWeight: 700 }}>{fmtNum(item.weight)}</td>
                      <td style={s.td}>{item.receive_date}</td>
                      <td style={{ ...s.td, textAlign: 'center' }}>
                        <span style={{ color: getDaysColor(item.days_in_stock), fontWeight: 700 }}>{item.days_in_stock} วัน</span>
                      </td>
                      <td style={s.td}><span style={s.statusIn}>มีในคลัง</span></td>
                      <td style={s.td}>
                        <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                          <button onClick={() => setWithdrawModal({ open: true, item })} style={s.withdrawBtn}
                            onMouseEnter={e => e.currentTarget.style.background = '#fecaca'}
                            onMouseLeave={e => e.currentTarget.style.background = '#fee2e2'}>
                            📤 เบิก
                          </button>
                          <button onClick={() => openConfirm(item.id, item.name, 'delinventory')} style={s.delBtn}
                            onMouseEnter={e => e.currentTarget.style.background = '#fecaca'}
                            onMouseLeave={e => e.currentTarget.style.background = '#fee2e2'}>
                            🗑️ ลบ
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          </div>
          <p style={s.total}>รวมทั้งหมด: {filteredInventory.length} รายการ</p>
        </div>
      )}

      {/* ── TAB: ประวัติการเบิก ── */}
      {activeTab === 'withdrawals' && (
        <div>
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
            <button onClick={() => exportWithdrawalsExcel(withdrawals)} style={s.exportBtn('#10b981')}>📥 Excel</button>
            <button onClick={() => exportWithdrawalsPDF(withdrawals)}   style={s.exportBtn('#ef4444')}>📄 PDF</button>
          </div>
          <div style={s.tableWrapper}>
            <table style={s.table}>
              <thead>
                <tr style={s.thead}>
                  {['รหัสคลัง','ชื่อวัตถุดิบ','หมวดหมู่','น้ำหนักที่เบิก (ก.)','วันที่เบิก','เหตุผล','เบิกไปแล้ว','จัดการ'].map(h => <th key={h} style={s.th}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {withdrawals.length === 0
                  ? <tr><td colSpan={8} style={s.empty}>ไม่มีประวัติการเบิก</td></tr>
                  : withdrawals.map((w, i) => (
                    <tr key={w.id || i} style={i % 2 === 0 ? s.trEven : s.trOdd}>
                      <td style={s.td}><strong style={{ fontFamily: 'monospace', color: '#6c63ff' }}>{w.code}</strong></td>
                      <td style={s.td}>{w.name}</td>
                      <td style={s.td}><span style={s.badge}>{w.category}</span></td>
                      <td style={{ ...s.td, color: '#ef4444', fontWeight: 700, textAlign: 'right' }}>-{fmtNum(w.amount)}</td>
                      <td style={s.td}>{w.withdraw_date}</td>
                      <td style={{ ...s.td, textAlign: 'left', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{w.reason || '—'}</td>
                      <td style={{ ...s.td, color: '#bbb' }}>{w.days_ago} วัน</td>
                      <td style={s.td}>
                        <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                          <button onClick={() => openConfirm(w.id, w.name, 'undo')} style={s.undoBtn}
                            onMouseEnter={e => e.currentTarget.style.background = '#fde68a'}
                            onMouseLeave={e => e.currentTarget.style.background = '#fef3c7'}>
                            ↩️ Undo
                          </button>
                          <button onClick={() => openConfirm(w.id, w.name, 'delwithdraw')} style={s.delBtn}
                            onMouseEnter={e => e.currentTarget.style.background = '#fecaca'}
                            onMouseLeave={e => e.currentTarget.style.background = '#fee2e2'}>
                            🗑️ ลบ
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          </div>
          <p style={s.total}>รวมทั้งหมด: {withdrawals.length} รายการ</p>
        </div>
      )}
    </div>
  );
};

const s = {
  fi:          { padding: '8px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 13, outline: 'none' },
  searchInput: { flex: 2, minWidth: '200px', padding: '0.65rem 1rem', border: '1px solid #ddd', borderRadius: 8, fontSize: '0.95rem', outline: 'none' },
  select:      { flex: 1, minWidth: '150px', padding: '0.65rem 1rem', border: '1px solid #ddd', borderRadius: 8, fontSize: '0.95rem', backgroundColor: 'white', outline: 'none' },
  exportBtn:   (bg) => ({ padding: '8px 14px', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 13, background: bg, color: 'white', whiteSpace: 'nowrap' }),
  tableWrapper:{ overflowX: 'auto', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.07)' },
  table:       { width: '100%', borderCollapse: 'collapse', backgroundColor: 'white' },
  thead:       { backgroundColor: '#1e293b' },
  th:          { padding: '0.85rem 1rem', color: 'white', fontWeight: 700, fontSize: '0.82rem', textAlign: 'center', whiteSpace: 'nowrap' },
  td:          { padding: '0.7rem 1rem', fontSize: '0.88rem', color: '#333', textAlign: 'center', borderBottom: '1px solid #f0f0f0' },
  trEven:      { backgroundColor: 'white' },
  trOdd:       { backgroundColor: '#f9fafb' },
  badge:       { backgroundColor: '#e0f2fe', color: '#0369a1', padding: '2px 10px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 700 },
  statusIn:    { backgroundColor: '#d1fae5', color: '#065f46', padding: '2px 10px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 700 },
  empty:       { textAlign: 'center', padding: '2.5rem', color: '#ccc', fontStyle: 'italic' },
  total:       { textAlign: 'right', marginTop: '0.75rem', color: '#999', fontSize: '0.82rem' },
  withdrawBtn: { padding: '5px 10px', borderRadius: 7, cursor: 'pointer', fontSize: 12, fontWeight: 700, background: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5', whiteSpace: 'nowrap', transition: 'background .15s' },
  undoBtn:     { padding: '5px 10px', borderRadius: 7, cursor: 'pointer', fontSize: 12, fontWeight: 700, background: '#fef3c7', color: '#d97706', border: '1px solid #fcd34d', whiteSpace: 'nowrap', transition: 'background .15s' },
  delBtn:      { padding: '5px 10px', borderRadius: 7, cursor: 'pointer', fontSize: 12, fontWeight: 700, background: '#fee2e2', color: '#ef4444', border: '1px solid #fca5a5', whiteSpace: 'nowrap', transition: 'background .15s' },
};

export default WarehouseDashboard;