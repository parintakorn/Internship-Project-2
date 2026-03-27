import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import * as XLSX from 'xlsx';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const authHeaders = () => {
  const token = localStorage.getItem('token') || '';
  return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
};
const fmtNum = (n, d = 2) => Number(n || 0).toLocaleString('th-TH', { maximumFractionDigits: d });

const StatCard = ({ color, icon, label, value, sub }) => (
  <div style={{ background: 'white', borderRadius: 12, padding: '1.25rem', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', borderLeft: `5px solid ${color}`, transition: 'transform .2s' }}
    onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
    onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
  >
    <div style={{ fontSize: '1.75rem', marginBottom: 6 }}>{icon}</div>
    <div style={{ fontSize: '0.75rem', color: '#aaa', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
    <div style={{ fontSize: '1.6rem', fontWeight: 800, color }}>{value}</div>
    {sub && <div style={{ fontSize: '0.72rem', color: '#ccc', marginTop: 3 }}>{sub}</div>}
  </div>
);

const CategoryBar = ({ data }) => {
  if (!data?.length) return <div style={{ textAlign: 'center', padding: 32, color: '#bbb' }}>ไม่มีข้อมูล</div>;
  const max = Math.max(...data.map(d => Math.max(+d.received_g, +d.withdrawn_g)), 1);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {data.filter(d => +d.received_g > 0 || +d.withdrawn_g > 0).map((d, i) => (
        <div key={i}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
            <span style={{ fontWeight: 700, color: '#444' }}>{d.category}</span>
            <span style={{ color: '#999' }}>รับ {fmtNum(d.received_g / 1000, 1)}kg / เบิก {fmtNum(d.withdrawn_g / 1000, 1)}kg</span>
          </div>
          <div style={{ background: '#f3f4f6', borderRadius: 6, height: 10, overflow: 'hidden', position: 'relative' }}>
            <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${(+d.received_g / max) * 100}%`, background: '#3b82f6', borderRadius: 6, opacity: 0.85 }} />
          </div>
          <div style={{ background: '#f3f4f6', borderRadius: 6, height: 10, overflow: 'hidden', position: 'relative', marginTop: 3 }}>
            <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${(+d.withdrawn_g / max) * 100}%`, background: '#ef4444', borderRadius: 6, opacity: 0.85 }} />
          </div>
        </div>
      ))}
      <div style={{ display: 'flex', gap: 16, fontSize: 11, color: '#888', marginTop: 4 }}>
        <span><span style={{ display: 'inline-block', width: 10, height: 10, background: '#3b82f6', borderRadius: 2, marginRight: 4 }} />รับเข้า</span>
        <span><span style={{ display: 'inline-block', width: 10, height: 10, background: '#ef4444', borderRadius: 2, marginRight: 4 }} />เบิกออก</span>
      </div>
    </div>
  );
};

// ── Print Document Component ────────────────────────────────────
const PrintTimeline = ({ items }) => {
  if (!items.length) return <div style={{ textAlign: 'center', padding: '1rem', color: '#bbb', fontStyle: 'italic' }}>ไม่มีรายการความเคลื่อนไหว</div>;
  const fmtTime = (str) => {
    if (!str) return '';
    try { return new Date(str).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }); } catch { return ''; }
  };
  return (
    <div style={{ paddingLeft: 4 }}>
      {items.map((item, i) => {
        const isIn = item.type === 'receive';
        const wt   = isIn ? (item.original_weight ?? item.weight ?? 0) : (item.amount ?? 0);
        const dt   = item.created_at || item.receive_date || item.withdraw_date || '';
        return (
          <div key={i} style={{ display: 'flex', gap: 10, position: 'relative', marginBottom: 8, pageBreakInside: 'avoid' }}>
            {i < items.length - 1 && (
              <div style={{ position: 'absolute', left: 15, top: 34, width: 2, height: 'calc(100% + 0px)', background: '#e5e7eb', zIndex: 0 }} />
            )}
            <div style={{ flexShrink: 0, width: 32, height: 32, borderRadius: '50%', background: isIn ? '#dbeafe' : '#fee2e2', border: `2px solid ${isIn ? '#3b82f6' : '#ef4444'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, zIndex: 1, marginTop: 2 }}>
              {isIn ? '📥' : '📤'}
            </div>
            <div style={{ flex: 1, background: isIn ? '#fafcff' : '#fffafa', borderRadius: 8, padding: '7px 12px', border: `1px solid ${isIn ? '#bfdbfe' : '#fecaca'}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 800, fontSize: 13, color: '#1a1a2e' }}>{item.name}</span>
                  <span style={{ fontSize: 10, background: '#e0f2fe', color: '#0369a1', borderRadius: 20, padding: '1px 7px', fontWeight: 700 }}>{item.category}</span>
                  <span style={{ fontSize: 10, background: isIn ? '#dbeafe' : '#fee2e2', color: isIn ? '#1d4ed8' : '#dc2626', borderRadius: 20, padding: '1px 7px', fontWeight: 700 }}>
                    {isIn ? '📥 รับเข้า' : '📤 เบิกออก'}
                  </span>
                </div>
                <span style={{ fontSize: 10, color: '#bbb' }}>{fmtTime(dt)}</span>
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 4, flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ fontSize: 10, color: '#aaa' }}>รหัส: <span style={{ fontFamily: 'monospace', color: '#6c63ff', fontWeight: 700 }}>{item.code}</span></span>
                <span style={{ fontSize: 13, fontWeight: 800, color: isIn ? '#3b82f6' : '#ef4444' }}>
                  {isIn ? '+' : '-'}{fmtNum(wt)} ก.
                  <span style={{ fontSize: 10, color: '#aaa', fontWeight: 400, marginLeft: 4 }}>({fmtNum(wt / 1000, 3)} kg)</span>
                </span>
                {item.reason && <span style={{ fontSize: 10, color: '#888', fontStyle: 'italic' }}>💬 {item.reason}</span>}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

const PrintDocument = ({ data, date }) => {
  if (!data) return null;
  const netWeight = data.summary.total_received_g - data.summary.total_withdrawn_g;
  const allMovements = [
    ...(data.received  || []).map(r => ({ ...r, type: 'receive'  })),
    ...(data.withdrawn || []).map(w => ({ ...w, type: 'withdraw' })),
  ].sort((a, b) => {
    const da = new Date(a.created_at || a.receive_date  || a.withdraw_date || 0);
    const db = new Date(b.created_at || b.receive_date  || b.withdraw_date || 0);
    return db - da;
  });

  const thP = { padding: '7px 10px', background: '#1e293b', color: 'white', fontWeight: 700, fontSize: 11, textAlign: 'center', border: '1px solid #334155' };
  const tdP = { padding: '6px 10px', fontSize: 11, color: '#333', textAlign: 'center', border: '1px solid #e5e7eb' };

  return (
   <div className="print-document" style={{ visibility: 'hidden', position: 'absolute', left: 0, top: 0, width: '210mm', background: 'white' }}>

      {/* Company Header */}
      <div style={{ background: '#F5E6D3', border: '2px solid #C8A882', borderRadius: 6, padding: '14px 18px', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, borderBottom: '2px solid #C8A882', paddingBottom: 12, marginBottom: 12 }}>
          <img src="/images/1212.jpg" alt="BIGURI" style={{ width: 100, height: 100, objectFit: 'contain', flexShrink: 0 }} />
          <div style={{ flex: 1, fontSize: 11, lineHeight: 1.7, color: '#333' }}>
            <div style={{ fontWeight: 'bold', fontSize: 20, color: '#000', marginBottom: 2 }}>BIGURI - PREMIUM JAPANESE FOOD</div>
            <div style={{ fontWeight: 600, color: '#000', fontSize: 11, marginBottom: 2 }}>สำนักงานใหญ่</div>
            <div>52 ซอยรัชดาภิเษก 36 แยก11 แขวงจันทรเกษม เขตจตุจักร กรุงเทพมหานคร 10900</div>
            <div style={{ color: '#555', fontSize: 10 }}>Head office : 52 Ratchada 36 Yak 11 Chankasem, Chatuchak, Bangkok 10900</div>
            <div style={{ marginTop: 2 }}>โทร. <strong>0629532761</strong></div>
          </div>
          <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <div style={{ fontSize: 10, fontWeight: 600, textAlign: 'center', color: '#000' }}>Facebook : Biguri<br />วัตถุดิบอาหารญี่ปุ่นพรีเมียม</div>
            <img src="/images/13541.jpg" alt="LINE QR" style={{ width: 80, height: 80, border: '2px solid #C8A882', padding: 3, background: 'white' }} />
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#1e293b' }}>📆 รายงานคลังวัตถุดิบรายวัน</div>
            <div style={{ fontSize: 11, color: '#666', marginTop: 2 }}>Warehouse Daily Report</div>
          </div>
          <div style={{ textAlign: 'right', fontSize: 11, color: '#444', lineHeight: 1.9 }}>
            <div><strong>วันที่:</strong> {new Date(date).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}</div>
            <div><strong>พิมพ์เมื่อ:</strong> {new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })} {new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}</div>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, marginBottom: 14 }}>
        {[
          { label: 'รายการรับเข้า',  value: fmtNum(data.summary.total_received_items,  0) + ' รายการ', color: '#3b82f6', bg: '#eff6ff' },
          { label: 'น้ำหนักรับเข้า', value: fmtNum(data.summary.total_received_g / 1000) + ' kg',      color: '#10b981', bg: '#f0fdf4' },
          { label: 'รายการเบิกออก',  value: fmtNum(data.summary.total_withdrawn_items,  0) + ' รายการ', color: '#ef4444', bg: '#fef2f2' },
          { label: 'น้ำหนักเบิกออก', value: fmtNum(data.summary.total_withdrawn_g / 1000) + ' kg',      color: '#f59e0b', bg: '#fffbeb' },
          { label: 'สุทธิวันนี้',    value: (netWeight >= 0 ? '+' : '') + fmtNum(netWeight / 1000) + ' kg', color: netWeight >= 0 ? '#10b981' : '#ef4444', bg: netWeight >= 0 ? '#f0fdf4' : '#fef2f2' },
        ].map(({ label, value, color, bg }) => (
          <div key={label} style={{ background: bg, border: `1px solid ${color}40`, borderLeft: `4px solid ${color}`, borderRadius: 6, padding: '8px 10px' }}>
            <div style={{ fontSize: 9, color: '#888', fontWeight: 700, marginBottom: 3, textTransform: 'uppercase' }}>{label}</div>
            <div style={{ fontSize: 13, fontWeight: 800, color }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Category Table */}
      {data.by_category.filter(d => +d.received_g > 0 || +d.withdrawn_g > 0).length > 0 && (
        <div style={{ marginBottom: 14, pageBreakInside: 'avoid' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#1e293b', marginBottom: 6, paddingBottom: 5, borderBottom: '2px solid #C8A882' }}>📊 สรุปตามหมวดหมู่</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
            <thead>
              <tr>{['หมวดหมู่','รับเข้า (ก.)','รับเข้า (kg)','เบิกออก (ก.)','เบิกออก (kg)','สุทธิ (ก.)'].map(h => (
                <th key={h} style={{ ...thP, textAlign: h === 'หมวดหมู่' ? 'left' : 'right' }}>{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {data.by_category.filter(d => +d.received_g > 0 || +d.withdrawn_g > 0).map((d, i) => {
                const net = +d.received_g - +d.withdrawn_g;
                return (
                  <tr key={i} style={{ background: i % 2 === 0 ? 'white' : '#f9fafb' }}>
                    <td style={{ ...tdP, textAlign: 'left', fontWeight: 700 }}>{d.category}</td>
                    <td style={{ ...tdP, textAlign: 'right', color: '#3b82f6', fontWeight: 700 }}>{fmtNum(d.received_g)}</td>
                    <td style={{ ...tdP, textAlign: 'right', color: '#3b82f6' }}>{fmtNum(d.received_g / 1000, 3)}</td>
                    <td style={{ ...tdP, textAlign: 'right', color: '#ef4444', fontWeight: 700 }}>{fmtNum(d.withdrawn_g)}</td>
                    <td style={{ ...tdP, textAlign: 'right', color: '#ef4444' }}>{fmtNum(d.withdrawn_g / 1000, 3)}</td>
                    <td style={{ ...tdP, textAlign: 'right', fontWeight: 800, color: net >= 0 ? '#10b981' : '#ef4444' }}>{net >= 0 ? '+' : ''}{fmtNum(net)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Timeline Movements */}
      <div>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#1e293b', marginBottom: 8, paddingBottom: 5, borderBottom: '2px solid #C8A882' }}>
          🔄 รายการความเคลื่อนไหวทั้งหมด ({allMovements.length} รายการ)
        </div>
        <PrintTimeline items={allMovements} />
      </div>

      {/* Footer */}
      <div style={{ marginTop: 20, paddingTop: 12, borderTop: '2px solid #C8A882', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', pageBreakInside: 'avoid' }}>
        <div style={{ fontSize: 9, color: '#888' }}>
          <div>เอกสารนี้ออกโดยระบบจัดการคลังวัตถุดิบ BIGURI</div>
          <div>พิมพ์เมื่อ: {new Date().toLocaleString('th-TH')}</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 36, fontSize: 11, textAlign: 'center' }}>
          {['ผู้จัดทำ', 'ผู้ตรวจสอบ', 'ผู้อนุมัติ'].map(role => (
            <div key={role}><div style={{ borderTop: '1px solid #888', paddingTop: 4, marginTop: 32 }}>{role}</div></div>
          ))}
        </div>
      </div>
    </div>
  );
};

const WarehouseReportDaily = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [date, setDate] = useState(searchParams.get('date') || new Date().toISOString().slice(0, 10));
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('movement');
  const [movFilter, setMovFilter] = useState('all');
  const [movSearch, setMovSearch] = useState('');

  const fetchReport = async (d) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/warehouse/report/daily?date=${d}`, { headers: authHeaders() });
      const json = await res.json();
      if (json.success) setData(json);
      else setData(null);
    } catch (err) {
      console.error(err);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchReport(date); }, [date]);

  const allMovements = data ? [
    ...(data.received  || []).map(r => ({ ...r, type: 'receive'  })),
    ...(data.withdrawn || []).map(w => ({ ...w, type: 'withdraw' })),
  ].sort((a, b) => {
    const da = new Date(a.created_at || a.receive_date  || a.withdraw_date || 0);
    const db = new Date(b.created_at || b.receive_date  || b.withdraw_date || 0);
    return db - da;
  }) : [];

  const filteredMovements = allMovements.filter(m => {
    const matchT = movFilter === 'all' || m.type === movFilter;
    const q = movSearch.toLowerCase();
    const matchS = !q || (m.name || '').toLowerCase().includes(q) || (m.code || '').toLowerCase().includes(q);
    return matchT && matchS;
  });

  const exportExcel = () => {
    if (!data) return;
    const wb = XLSX.utils.book_new();
    const movRows = allMovements.map(m => ({
      'ประเภท': m.type === 'receive' ? 'รับเข้า' : 'เบิกออก',
      'รหัส': m.code, 'ชื่อวัตถุดิบ': m.name, 'หมวดหมู่': m.category,
      'น้ำหนัก (ก.)': m.type === 'receive' ? m.original_weight : m.amount,
      'เหตุผล': m.reason || '-',
      'วันที่': m.receive_date || m.withdraw_date,
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(movRows), 'ความเคลื่อนไหว');
    const recRows = data.received.map(r => ({ 'รหัส': r.code, 'ชื่อ': r.name, 'หมวดหมู่': r.category, 'น้ำหนัก (ก.)': r.weight, 'วันที่รับ': r.receive_date }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(recRows), 'รับเข้า');
    const witRows = data.withdrawn.map(w => ({ 'รหัส': w.code, 'ชื่อ': w.name, 'หมวดหมู่': w.category, 'จำนวนเบิก (ก.)': w.amount, 'เหตุผล': w.reason || '-', 'วันที่เบิก': w.withdraw_date }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(witRows), 'เบิกออก');
    XLSX.writeFile(wb, `warehouse_daily_${date}.xlsx`);
  };

  const exportPDF = () => {
  const content = document.querySelector('.print-document');
  if (!content) return;
  
  const win = window.open('', '_blank', 'width=900,height=700');
  win.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        @page { size: A4 portrait; margin: 10mm 12mm; }
        body { margin: 0; padding: 0; font-family: sans-serif; background: white; }
        * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
      </style>
    </head>
    <body>${content.innerHTML}</body>
    </html>
  `);
  win.document.close();
  win.onload = () => {
    win.focus();
    win.print();
    win.close();
  };
};

  const tabStyle = (v) => ({
    padding: '8px 20px', border: 'none', background: 'transparent', cursor: 'pointer',
    fontWeight: 700, fontSize: 14,
    borderBottom: `3px solid ${activeTab === v ? '#3b82f6' : 'transparent'}`,
    color: activeTab === v ? '#3b82f6' : '#888', transition: 'all .2s',
  });

  const thStyle = { padding: '10px 12px', color: 'white', fontWeight: 700, fontSize: 12, textAlign: 'center', whiteSpace: 'nowrap' };
  const tdStyle = { padding: '9px 12px', fontSize: 13, color: '#333', textAlign: 'center', borderBottom: '1px solid #f0f0f0' };
  const netWeight = data ? (data.summary.total_received_g - data.summary.total_withdrawn_g) : 0;

  return (
    <div style={{ padding: '1.5rem', background: '#f5f5f5', minHeight: '100vh' }}>
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(16px) } to { opacity:1; transform:none } }
        .report-card { animation: fadeUp .35s ease both }

        /* ── Print styles ── */
        @media print {
  @page { size: A4 portrait; margin: 10mm 12mm; }
  html, body { 
    height: auto !important; 
    overflow: visible !important; 
    margin: 0 !important; 
    padding: 0 !important; 
  }
  body * { visibility: hidden !important; }
  .print-document, .print-document * { visibility: visible !important; }
  .print-document {
    display: block !important;
    position: fixed !important;   /* ← เปลี่ยนจาก absolute */
    top: 0 !important;
    left: 0 !important;
    right: 0 !important;
    bottom: auto !important;      /* ← เพิ่ม */
    width: 100% !important;
    height: auto !important;
    overflow: visible !important; /* ← สำคัญมาก */
    background: white !important;
    padding: 0 !important;
    margin: 0 !important;
  }
  .no-print { display: none !important; }
  * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
}
      `}</style>

      {/* ── Print Document (hidden on screen) ── */}
      <PrintDocument data={data} date={date} />

      {/* ── HEADER ── */}
      <div className="no-print" style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <button onClick={() => navigate(-1)} style={{ padding: '8px 14px', background: '#f3f4f6', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 14, color: '#555' }}>
          ← กลับ
        </button>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#1a1a2e', margin: 0 }}>📆 รายงานรายวัน</h1>
          <p style={{ color: '#999', margin: '0.2rem 0 0', fontSize: '0.85rem' }}>รับเข้าและเบิกออกวัตถุดิบประจำวัน พร้อมรายละเอียดความเคลื่อนไหว</p>
        </div>
      </div>

      {/* ── FILTER ── */}
      <div className="no-print report-card" style={{ background: 'white', borderRadius: 12, padding: '1rem 1.25rem', marginBottom: '1.25rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.06em' }}>📅 เลือกวันที่</span>
        <input type="date" value={date} onChange={e => setDate(e.target.value)}
          style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, outline: 'none' }} />
        <button onClick={() => fetchReport(date)} style={{ padding: '8px 18px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
          🔍 ดูข้อมูล
        </button>
        {data && <>
          <button onClick={exportExcel} style={{ padding: '8px 14px', background: '#10b981', color: 'white', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer', marginLeft: 'auto' }}>📥 Excel</button>
          <button onClick={exportPDF}   style={{ padding: '8px 14px', background: '#ef4444', color: 'white', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>🖨️ พิมพ์</button>
        </>}
      </div>

      {loading && <div style={{ textAlign: 'center', padding: '3rem', color: '#888' }}>⏳ กำลังโหลด...</div>}

      {!loading && data && (
        <div className="no-print">
          {/* STAT CARDS */}
          <div className="report-card" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(170px,1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
            <StatCard color="#3b82f6" icon="📥" label="รายการรับเข้า"  value={fmtNum(data.summary.total_received_items, 0)}  sub="รายการ" />
            <StatCard color="#10b981" icon="⚖️" label="น้ำหนักรับเข้า" value={fmtNum(data.summary.total_received_g / 1000)}  sub="กิโลกรัม" />
            <StatCard color="#ef4444" icon="📤" label="รายการเบิกออก"  value={fmtNum(data.summary.total_withdrawn_items, 0)} sub="รายการ" />
            <StatCard color="#f59e0b" icon="📉" label="น้ำหนักเบิกออก" value={fmtNum(data.summary.total_withdrawn_g / 1000)} sub="กิโลกรัม" />
            <StatCard color={netWeight >= 0 ? '#10b981' : '#ef4444'} icon="⚖️" label="สุทธิวันนี้" value={(netWeight >= 0 ? '+' : '') + fmtNum(netWeight / 1000)} sub="กิโลกรัม" />
          </div>

          {/* CHARTS + CATEGORY TABLE */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
            <div className="report-card" style={{ background: 'white', borderRadius: 12, padding: '1.25rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
              <h3 style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: 700, color: '#1a1a2e' }}>📊 สรุปตามหมวดหมู่</h3>
              <CategoryBar data={data.by_category} />
            </div>
            <div className="report-card" style={{ background: 'white', borderRadius: 12, padding: '1.25rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
              <h3 style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: 700, color: '#1a1a2e' }}>📋 สรุปหมวดหมู่ (ตาราง)</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#1e293b' }}>
                    {['หมวดหมู่', 'รับเข้า (ก.)', 'เบิกออก (ก.)', 'สุทธิ (ก.)'].map(h => (
                      <th key={h} style={{ ...thStyle, textAlign: h === 'หมวดหมู่' ? 'left' : 'right' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.by_category.filter(d => +d.received_g > 0 || +d.withdrawn_g > 0).map((d, i) => {
                    const net = +d.received_g - +d.withdrawn_g;
                    return (
                      <tr key={i} style={{ background: i % 2 === 0 ? 'white' : '#f9fafb' }}>
                        <td style={{ ...tdStyle, textAlign: 'left' }}><span style={{ background: '#e0f2fe', color: '#0369a1', padding: '2px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>{d.category}</span></td>
                        <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700, color: '#3b82f6' }}>{fmtNum(d.received_g)}</td>
                        <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700, color: '#ef4444' }}>{fmtNum(d.withdrawn_g)}</td>
                        <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700, color: net >= 0 ? '#10b981' : '#ef4444' }}>{net >= 0 ? '+' : ''}{fmtNum(net)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* DETAIL TABS */}
          <div className="report-card" style={{ background: 'white', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
            <div style={{ display: 'flex', borderBottom: '2px solid #e5e7eb' }}>
              <button style={tabStyle('movement')}  onClick={() => setActiveTab('movement')}>🔄 ความเคลื่อนไหวทั้งหมด ({allMovements.length})</button>
              <button style={tabStyle('received')}  onClick={() => setActiveTab('received')}>📥 รับเข้า ({data.received.length})</button>
              <button style={tabStyle('withdrawn')} onClick={() => setActiveTab('withdrawn')}>📤 เบิกออก ({data.withdrawn.length})</button>
            </div>

            {activeTab === 'movement' && (
              <div style={{ padding: '1rem' }}>
                <div style={{ display: 'flex', gap: 8, marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                  <input type="text" placeholder="🔍 ค้นหาชื่อหรือรหัส..." value={movSearch} onChange={e => setMovSearch(e.target.value)}
                    style={{ flex: 1, minWidth: 180, padding: '7px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 13, outline: 'none' }} />
                  {[['ทั้งหมด','all'],['📥 รับเข้า','receive'],['📤 เบิกออก','withdraw']].map(([label, val]) => (
                    <button key={val} onClick={() => setMovFilter(val)} style={{ padding: '7px 14px', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 12, background: movFilter === val ? '#3b82f6' : '#f3f4f6', color: movFilter === val ? 'white' : '#666' }}>
                      {label}
                    </button>
                  ))}
                  <span style={{ fontSize: 12, color: '#aaa', marginLeft: 'auto' }}>{filteredMovements.length} รายการ</span>
                </div>
                <Timeline items={filteredMovements} />
              </div>
            )}

            {activeTab === 'received' && (
              <div style={{ padding: '1rem', overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#1e293b' }}>
                      {['#', 'รหัส', 'ชื่อวัตถุดิบ', 'หมวดหมู่', 'น้ำหนัก (ก.)', 'วันที่รับ'].map(h => <th key={h} style={thStyle}>{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {data.received.length === 0
                      ? <tr><td colSpan={6} style={{ padding: 24, textAlign: 'center', color: '#ccc', fontStyle: 'italic' }}>ไม่มีรายการรับเข้าวันนี้</td></tr>
                      : data.received.map((r, i) => (
                        <tr key={i} style={{ background: i % 2 === 0 ? 'white' : '#f9fafb' }}>
                          <td style={{ ...tdStyle, color: '#aaa', fontSize: 11 }}>{i + 1}</td>
                          <td style={tdStyle}><strong style={{ fontFamily: 'monospace', color: '#6c63ff' }}>{r.code}</strong></td>
                          <td style={{ ...tdStyle, textAlign: 'left', fontWeight: 600 }}>{r.name}</td>
                          <td style={tdStyle}><span style={{ background: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>{r.category}</span></td>
                          <td style={{ ...tdStyle, fontWeight: 800, color: '#3b82f6' }}>+{fmtNum(r.original_weight ?? r.weight)}</td>
                          <td style={tdStyle}>{r.receive_date}</td>
                        </tr>
                      ))
                    }
                  </tbody>
                  {data.received.length > 0 && (
                    <tfoot>
                      <tr style={{ background: '#eff6ff' }}>
                        <td colSpan={4} style={{ ...tdStyle, fontWeight: 800, textAlign: 'right', color: '#1e293b' }}>รวมทั้งหมด</td>
                        <td style={{ ...tdStyle, fontWeight: 800, color: '#3b82f6' }}>+{fmtNum(data.received.reduce((s, r) => s + Number(r.original_weight ?? r.weight ?? 0), 0))}</td>
                        <td style={tdStyle} />
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            )}

            {activeTab === 'withdrawn' && (
              <div style={{ padding: '1rem', overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#1e293b' }}>
                      {['#', 'รหัส', 'ชื่อวัตถุดิบ', 'หมวดหมู่', 'จำนวนเบิก (ก.)', 'เหตุผล', 'วันที่เบิก'].map(h => <th key={h} style={thStyle}>{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {data.withdrawn.length === 0
                      ? <tr><td colSpan={7} style={{ padding: 24, textAlign: 'center', color: '#ccc', fontStyle: 'italic' }}>ไม่มีรายการเบิกออกวันนี้</td></tr>
                      : data.withdrawn.map((w, i) => (
                        <tr key={i} style={{ background: i % 2 === 0 ? 'white' : '#f9fafb' }}>
                          <td style={{ ...tdStyle, color: '#aaa', fontSize: 11 }}>{i + 1}</td>
                          <td style={tdStyle}><strong style={{ fontFamily: 'monospace', color: '#6c63ff' }}>{w.code}</strong></td>
                          <td style={{ ...tdStyle, textAlign: 'left', fontWeight: 600 }}>{w.name}</td>
                          <td style={tdStyle}><span style={{ background: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>{w.category}</span></td>
                          <td style={{ ...tdStyle, fontWeight: 800, color: '#ef4444' }}>-{fmtNum(w.amount)}</td>
                          <td style={{ ...tdStyle, textAlign: 'left', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#666', fontStyle: w.reason ? 'normal' : 'italic' }}>{w.reason || '—'}</td>
                          <td style={tdStyle}>{w.withdraw_date}</td>
                        </tr>
                      ))
                    }
                  </tbody>
                  {data.withdrawn.length > 0 && (
                    <tfoot>
                      <tr style={{ background: '#fef2f2' }}>
                        <td colSpan={4} style={{ ...tdStyle, fontWeight: 800, textAlign: 'right', color: '#1e293b' }}>รวมทั้งหมด</td>
                        <td style={{ ...tdStyle, fontWeight: 800, color: '#ef4444' }}>-{fmtNum(data.withdrawn.reduce((s, w) => s + Number(w.amount || 0), 0))}</td>
                        <td colSpan={2} style={tdStyle} />
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {!loading && !data && (
        <div style={{ textAlign: 'center', padding: '4rem', color: '#ccc' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📭</div>
          <p>เลือกวันที่แล้วกด "ดูข้อมูล"</p>
        </div>
      )}
    </div>
  );
};

// ── Timeline Component ──────────────────────────────────────────
const Timeline = ({ items }) => {
  if (!items.length) return (
    <div style={{ textAlign: 'center', padding: '2.5rem', color: '#ccc' }}>
      <div style={{ fontSize: 36, marginBottom: 8 }}>📭</div>
      <p style={{ margin: 0 }}>ไม่มีรายการความเคลื่อนไหว</p>
    </div>
  );
  const fmtTime = (str) => {
    if (!str) return '';
    try { return new Date(str).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }); } catch { return ''; }
  };
  return (
    <div style={{ position: 'relative', paddingLeft: 4 }}>
      {items.map((item, i) => {
        const isIn = item.type === 'receive';
        return (
          <div key={i} style={{ display: 'flex', gap: 14, position: 'relative', marginBottom: 12 }}>
            {i < items.length - 1 && (
              <div style={{ position: 'absolute', left: 19, top: 42, width: 2, height: 'calc(100% + 0px)', background: '#e5e7eb', zIndex: 0 }} />
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
                <span style={{ fontSize: 11, color: '#bbb' }}>{fmtTime(item.created_at || item.receive_date || item.withdraw_date)}</span>
              </div>
              <div style={{ display: 'flex', gap: 16, marginTop: 7, flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ fontSize: 11, color: '#aaa' }}>รหัส: <span style={{ fontFamily: 'monospace', color: '#6c63ff', fontWeight: 700 }}>{item.code}</span></span>
                <span style={{ fontSize: 15, fontWeight: 800, color: isIn ? '#3b82f6' : '#ef4444' }}>
                  {isIn ? '+' : '-'}{fmtNum(isIn ? item.original_weight : item.amount)} ก.
                  <span style={{ fontSize: 11, color: '#aaa', fontWeight: 400, marginLeft: 4 }}>({fmtNum((isIn ? item.original_weight : item.amount) / 1000, 3)} kg)</span>
                </span>
                {item.reason && <span style={{ fontSize: 12, color: '#888', fontStyle: 'italic' }}>💬 {item.reason}</span>}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default WarehouseReportDaily;