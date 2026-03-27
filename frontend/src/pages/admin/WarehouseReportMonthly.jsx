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

const DailyBarChart = ({ data, height = 160 }) => {
  if (!data?.length) return <div style={{ textAlign: 'center', padding: 32, color: '#bbb' }}>ไม่มีข้อมูล</div>;
  const maxVal = Math.max(...data.flatMap(d => [+d.received_g, +d.withdrawn_g]), 1);
  const barW = 14, gap = 3;
  const totalW = data.length * (barW * 2 + gap * 3) + 30;
  return (
    <div style={{ overflowX: 'auto' }}>
      <svg width={totalW} height={height + 40} style={{ fontFamily: 'sans-serif', display: 'block' }}>
        {data.map((d, i) => {
          const x = 15 + i * (barW * 2 + gap * 3);
          const rH = (+d.received_g / maxVal) * height;
          const wH = (+d.withdrawn_g / maxVal) * height;
          const dayNum = (d.date || '').slice(0, 2);
          return (
            <g key={i}>
              <rect x={x} y={height - rH} width={barW} height={rH} fill="#3b82f6" rx={2} opacity={0.85} />
              <rect x={x + barW + gap} y={height - wH} width={barW} height={wH} fill="#ef4444" rx={2} opacity={0.85} />
              {i % 5 === 0 && <text x={x + barW + gap / 2} y={height + 15} textAnchor="middle" fontSize={9} fill="#aaa">{dayNum}</text>}
            </g>
          );
        })}
        <rect x={15} y={height + 24} width={10} height={10} fill="#3b82f6" rx={2} />
        <text x={28} y={height + 33} fontSize={10} fill="#666">รับเข้า</text>
        <rect x={80} y={height + 24} width={10} height={10} fill="#ef4444" rx={2} />
        <text x={93} y={height + 33} fontSize={10} fill="#666">เบิกออก</text>
      </svg>
    </div>
  );
};

const TopBar = ({ data }) => {
  if (!data?.length) return <div style={{ textAlign: 'center', padding: 32, color: '#bbb' }}>ไม่มีข้อมูล</div>;
  const max = Math.max(...data.map(d => +d.withdrawn_g), 1);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {data.map((d, i) => (
        <div key={i}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
            <span style={{ fontWeight: 700, color: '#444' }}>
              <span style={{ background: i < 3 ? '#fef3c7' : '#f3f4f6', color: i < 3 ? '#d97706' : '#999', borderRadius: 4, padding: '0 6px', marginRight: 6, fontSize: 11, fontWeight: 700 }}>#{i + 1}</span>
              {d.name}
            </span>
            <span style={{ color: '#ef4444', fontWeight: 700 }}>{fmtNum(d.withdrawn_g / 1000, 1)} kg</span>
          </div>
          <div style={{ background: '#f3f4f6', borderRadius: 6, height: 8, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${(+d.withdrawn_g / max) * 100}%`, background: i < 3 ? '#f59e0b' : '#ef4444', borderRadius: 6, opacity: 0.85 }} />
          </div>
        </div>
      ))}
    </div>
  );
};

const buildItemMap = (received, withdrawn) => {
  const itemMap = {};
  (received || []).forEach(r => {
    const key = r.code || r.name;
    if (!itemMap[key]) itemMap[key] = { code: r.code, name: r.name, category: r.category, received_g: 0, withdrawn_g: 0, receive_count: 0, withdraw_count: 0 };
    itemMap[key].received_g  += Number(r.original_weight ?? r.weight ?? 0);
    itemMap[key].receive_count++;
  });
  (withdrawn || []).forEach(w => {
    const key = w.code || w.name;
    if (!itemMap[key]) itemMap[key] = { code: w.code, name: w.name, category: w.category, received_g: 0, withdrawn_g: 0, receive_count: 0, withdraw_count: 0 };
    itemMap[key].withdrawn_g += Number(w.amount ?? 0);
    itemMap[key].withdraw_count++;
  });
  return Object.values(itemMap).sort((a, b) => b.received_g - a.received_g);
};

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

const PerItemTable = ({ items, thP, tdP }) => {
  if (!items.length) return null;
  const COLS = ['#', 'รหัส', 'ชื่อวัตถุดิบ', 'หมวดหมู่', 'รับเข้า (ก.)', 'ครั้งรับ', 'เบิกออก (ก.)', 'ครั้งเบิก', 'สุทธิ (ก.)'];
  const LEFT_COLS = ['ชื่อวัตถุดิบ', 'หมวดหมู่', 'รหัส'];
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: '#1e293b', marginBottom: 6, paddingBottom: 5, borderBottom: '2px solid #C8A882' }}>
        📦 สรุปรายวัตถุดิบ ({items.length} รายการ)
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
        <thead>
          <tr>
            {COLS.map((h, hi) => (
              <th key={hi} style={{ ...thP, textAlign: LEFT_COLS.includes(h) ? 'left' : 'right' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((d, i) => {
            const net = d.received_g - d.withdrawn_g;
            return (
              <tr key={i} style={{ background: i % 2 === 0 ? 'white' : '#f9fafb' }}>
                <td style={{ ...tdP, textAlign: 'right', color: '#aaa' }}>{i + 1}</td>
                <td style={{ ...tdP, textAlign: 'left', fontFamily: 'monospace', color: '#6c63ff', fontWeight: 700 }}>{d.code}</td>
                <td style={{ ...tdP, textAlign: 'left', fontWeight: 700 }}>{d.name}</td>
                <td style={{ ...tdP, textAlign: 'left' }}>
                  <span style={{ background: '#e0f2fe', color: '#0369a1', borderRadius: 20, padding: '1px 7px', fontSize: 10, fontWeight: 700 }}>{d.category}</span>
                </td>
                <td style={{ ...tdP, textAlign: 'right', color: '#3b82f6', fontWeight: 700 }}>{fmtNum(d.received_g)}</td>
                <td style={{ ...tdP, textAlign: 'right', color: '#64748b' }}>{d.receive_count}</td>
                <td style={{ ...tdP, textAlign: 'right', color: '#ef4444', fontWeight: 700 }}>{fmtNum(d.withdrawn_g)}</td>
                <td style={{ ...tdP, textAlign: 'right', color: '#64748b' }}>{d.withdraw_count}</td>
                <td style={{ ...tdP, textAlign: 'right', fontWeight: 800, color: net >= 0 ? '#10b981' : '#ef4444' }}>
                  {net >= 0 ? '+' : ''}{fmtNum(net)}
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr style={{ background: '#e8dcc8' }}>
            <td colSpan={4} style={{ ...tdP, textAlign: 'right', fontWeight: 800 }}>รวมทั้งหมด</td>
            <td style={{ ...tdP, textAlign: 'right', fontWeight: 800, color: '#3b82f6' }}>{fmtNum(items.reduce((s, d) => s + d.received_g, 0))}</td>
            <td style={{ ...tdP, textAlign: 'right', fontWeight: 800, color: '#64748b' }}>{items.reduce((s, d) => s + d.receive_count, 0)}</td>
            <td style={{ ...tdP, textAlign: 'right', fontWeight: 800, color: '#ef4444' }}>{fmtNum(items.reduce((s, d) => s + d.withdrawn_g, 0))}</td>
            <td style={{ ...tdP, textAlign: 'right', fontWeight: 800, color: '#64748b' }}>{items.reduce((s, d) => s + d.withdraw_count, 0)}</td>
            <td style={{ ...tdP, textAlign: 'right', fontWeight: 800, color: '#10b981' }}>
              {(() => { const n = items.reduce((s, d) => s + d.received_g - d.withdrawn_g, 0); return (n >= 0 ? '+' : '') + fmtNum(n); })()}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
};

const PrintDocument = ({ data, month }) => {
  if (!data) return null;
  const allMovements = [
    ...(data.received  || []).map(r => ({ ...r, type: 'receive'  })),
    ...(data.withdrawn || []).map(w => ({ ...w, type: 'withdraw' })),
  ].sort((a, b) => new Date(b.receive_date || b.withdraw_date || 0) - new Date(a.receive_date || a.withdraw_date || 0));

  const thP = { padding: '7px 10px', background: '#1e293b', color: 'white', fontWeight: 700, fontSize: 11, textAlign: 'center', border: '1px solid #334155' };
  const tdP = { padding: '6px 10px', fontSize: 11, color: '#333', textAlign: 'center', border: '1px solid #e5e7eb' };
  const monthLabel = new Date(month + '-01').toLocaleDateString('th-TH', { year: 'numeric', month: 'long' });
  const itemSummary = buildItemMap(data.received, data.withdrawn);

  return (
    <div className="print-document" style={{ display: 'none' }}>
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
            <div style={{ fontSize: 16, fontWeight: 800, color: '#1e293b' }}>📊 รายงานคลังวัตถุดิบรายเดือน</div>
            <div style={{ fontSize: 11, color: '#666', marginTop: 2 }}>Warehouse Monthly Report</div>
          </div>
          <div style={{ textAlign: 'right', fontSize: 11, color: '#444', lineHeight: 1.9 }}>
            <div><strong>เดือน:</strong> {monthLabel}</div>
            <div><strong>พิมพ์เมื่อ:</strong> {new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })} {new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}</div>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 14 }}>
        {[
          { label: 'รายการรับเข้า',  value: fmtNum(data.summary.total_received_items, 0) + ' รายการ', color: '#3b82f6', bg: '#eff6ff' },
          { label: 'น้ำหนักรับเข้า', value: fmtNum(data.summary.total_received_g / 1000) + ' kg',     color: '#10b981', bg: '#f0fdf4' },
          { label: 'เบิกมากที่สุด',  value: data.top_withdrawn[0]?.name || '-',                        color: '#ef4444', bg: '#fef2f2' },
          { label: 'ความเคลื่อนไหว', value: fmtNum(allMovements.length, 0) + ' รายการ',               color: '#8b5cf6', bg: '#f5f3ff' },
        ].map(({ label, value, color, bg }) => (
          <div key={label} style={{ background: bg, border: `1px solid ${color}40`, borderLeft: `4px solid ${color}`, borderRadius: 6, padding: '8px 10px' }}>
            <div style={{ fontSize: 9, color: '#888', fontWeight: 700, marginBottom: 3, textTransform: 'uppercase' }}>{label}</div>
            <div style={{ fontSize: 13, fontWeight: 800, color }}>{value}</div>
          </div>
        ))}
      </div>

      <PerItemTable items={itemSummary} thP={thP} tdP={tdP} />

      {data.by_category?.filter(d => +d.received_g > 0 || +d.withdrawn_g > 0).length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#1e293b', marginBottom: 6, paddingBottom: 5, borderBottom: '2px solid #C8A882' }}>📂 สรุปตามหมวดหมู่</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
            <thead>
              <tr>{['หมวดหมู่','รับเข้า (ก.)','เบิกออก (ก.)','สุทธิ (ก.)'].map(h => (
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
                    <td style={{ ...tdP, textAlign: 'right', color: '#ef4444', fontWeight: 700 }}>{fmtNum(d.withdrawn_g)}</td>
                    <td style={{ ...tdP, textAlign: 'right', fontWeight: 800, color: net >= 0 ? '#10b981' : '#ef4444' }}>{net >= 0 ? '+' : ''}{fmtNum(net)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {data.daily?.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#1e293b', marginBottom: 6, paddingBottom: 5, borderBottom: '2px solid #C8A882' }}>📅 สรุปรายวัน</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
            <thead>
              <tr>{['วันที่','รับเข้า (ก.)','เบิกออก (ก.)','สุทธิ (ก.)'].map(h => (
                <th key={h} style={{ ...thP, textAlign: h === 'วันที่' ? 'left' : 'right' }}>{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {data.daily.map((d, i) => {
                const net = +d.received_g - +d.withdrawn_g;
                return (
                  <tr key={i} style={{ background: i % 2 === 0 ? 'white' : '#f9fafb' }}>
                    <td style={{ ...tdP, textAlign: 'left', fontWeight: 700 }}>{d.date}</td>
                    <td style={{ ...tdP, textAlign: 'right', color: '#3b82f6', fontWeight: +d.received_g > 0 ? 700 : 400 }}>{fmtNum(d.received_g)}</td>
                    <td style={{ ...tdP, textAlign: 'right', color: '#ef4444', fontWeight: +d.withdrawn_g > 0 ? 700 : 400 }}>{fmtNum(d.withdrawn_g)}</td>
                    <td style={{ ...tdP, textAlign: 'right', fontWeight: 800, color: net >= 0 ? '#10b981' : '#ef4444' }}>{net >= 0 ? '+' : ''}{fmtNum(net)}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{ background: '#e8dcc8' }}>
                <td style={{ ...tdP, textAlign: 'left', fontWeight: 800 }}>รวมทั้งเดือน</td>
                <td style={{ ...tdP, textAlign: 'right', fontWeight: 800, color: '#3b82f6' }}>{fmtNum(data.daily.reduce((s, d) => s + +d.received_g, 0))}</td>
                <td style={{ ...tdP, textAlign: 'right', fontWeight: 800, color: '#ef4444' }}>{fmtNum(data.daily.reduce((s, d) => s + +d.withdrawn_g, 0))}</td>
                <td style={{ ...tdP, textAlign: 'right', fontWeight: 800, color: '#10b981' }}>
                  {(() => { const n = data.daily.reduce((s, d) => s + +d.received_g - +d.withdrawn_g, 0); return (n >= 0 ? '+' : '') + fmtNum(n); })()}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {data.top_withdrawn?.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#1e293b', marginBottom: 6, paddingBottom: 5, borderBottom: '2px solid #C8A882' }}>🏆 Top 10 วัตถุดิบที่เบิกมากสุด</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
            <thead>
              <tr>{['#','ชื่อวัตถุดิบ','หมวดหมู่','เบิกรวม (ก.)','จำนวนครั้ง','% ของรับเข้า'].map(h => <th key={h} style={thP}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {data.top_withdrawn.map((d, i) => {
                const pct = data.summary.total_received_g > 0 ? ((+d.withdrawn_g / data.summary.total_received_g) * 100).toFixed(1) : '0.0';
                return (
                  <tr key={i} style={{ background: i % 2 === 0 ? 'white' : '#f9fafb' }}>
                    <td style={{ ...tdP, fontWeight: 800 }}>#{i + 1}</td>
                    <td style={{ ...tdP, textAlign: 'left', fontWeight: 700 }}>{d.name}</td>
                    <td style={tdP}>{d.category}</td>
                    <td style={{ ...tdP, textAlign: 'right', fontWeight: 700, color: '#ef4444' }}>{fmtNum(d.withdrawn_g)}</td>
                    <td style={tdP}>{d.withdraw_count} ครั้ง</td>
                    <td style={{ ...tdP, fontWeight: 700 }}>{pct}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#1e293b', marginBottom: 8, paddingBottom: 5, borderBottom: '2px solid #C8A882' }}>
          🔄 รายการความเคลื่อนไหวทั้งหมด ({allMovements.length} รายการ)
        </div>
        <PrintTimeline items={allMovements} />
      </div>

      <div style={{ marginTop: 20, paddingTop: 12, borderTop: '2px solid #C8A882', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
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

const WarehouseReportMonthly = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [month, setMonth] = useState(searchParams.get('month') || new Date().toISOString().slice(0, 7));
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('movement');
  const [movFilter, setMovFilter] = useState('all');
  const [movSearch, setMovSearch] = useState('');

  const fetchReport = async (m) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/warehouse/report/monthly-detail?month=${m}`, { headers: authHeaders() });
      const json = await res.json();
      if (json.success) setData(json);
      else setData(null);
    } catch (err) { console.error(err); setData(null); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchReport(month); }, [month]);

  const allMovements = data ? [
    ...(data.received  || []).map(r => ({ ...r, type: 'receive'  })),
    ...(data.withdrawn || []).map(w => ({ ...w, type: 'withdraw' })),
  ].sort((a, b) => new Date(b.receive_date || b.withdraw_date || 0) - new Date(a.receive_date || a.withdraw_date || 0)) : [];

  const filteredMovements = allMovements.filter(m => {
    const q = movSearch.toLowerCase();
    return (movFilter === 'all' || m.type === movFilter) && (!q || (m.name || '').toLowerCase().includes(q) || (m.code || '').toLowerCase().includes(q));
  });

  const exportExcel = () => {
    if (!data) return;
    const wb = XLSX.utils.book_new();
    const movRows = allMovements.map(m => ({ 'ประเภท': m.type === 'receive' ? 'รับเข้า' : 'เบิกออก', 'รหัส': m.code, 'ชื่อ': m.name, 'หมวดหมู่': m.category, 'น้ำหนัก (ก.)': m.type === 'receive' ? m.original_weight : m.amount, 'เหตุผล': m.reason || '-', 'วันที่': m.receive_date || m.withdraw_date }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(movRows), 'ความเคลื่อนไหว');
    const dailyRows = data.daily.map(d => ({ 'วันที่': d.date, 'รับเข้า (ก.)': d.received_g, 'เบิกออก (ก.)': d.withdrawn_g, 'สุทธิ (ก.)': +d.received_g - +d.withdrawn_g }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(dailyRows), 'รายวัน');
    const itemRows = buildItemMap(data.received, data.withdrawn).map((d, i) => ({ 'ลำดับ': i+1, 'รหัส': d.code, 'ชื่อ': d.name, 'หมวดหมู่': d.category, 'รับเข้า (ก.)': d.received_g, 'ครั้งรับ': d.receive_count, 'เบิกออก (ก.)': d.withdrawn_g, 'ครั้งเบิก': d.withdraw_count, 'สุทธิ (ก.)': d.received_g - d.withdrawn_g }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(itemRows), 'รายวัตถุดิบ');
    const topRows = data.top_withdrawn.map((d, i) => ({ 'อันดับ': i + 1, 'ชื่อ': d.name, 'หมวดหมู่': d.category, 'เบิกรวม (ก.)': d.withdrawn_g, 'ครั้ง': d.withdraw_count }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(topRows), 'Top 10');
    XLSX.writeFile(wb, `warehouse_monthly_${month}.xlsx`);
  };

  const handlePrint = () => {
    const content = document.querySelector('.print-document');
    if (!content) return;
    const win = window.open('', '_blank', 'width=900,height=700');
    win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><style>
      @page { size: A4 portrait; margin: 10mm 12mm; }
      body { margin: 0; padding: 0; font-family: sans-serif; background: white; }
      * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    </style></head><body>${content.innerHTML}</body></html>`);
    win.document.close();
    win.onload = () => { win.focus(); win.print(); win.close(); };
  };

  const tabStyle = (v) => ({ padding: '8px 18px', border: 'none', background: 'transparent', cursor: 'pointer', fontWeight: 700, fontSize: 13, borderBottom: `3px solid ${activeTab === v ? '#3b82f6' : 'transparent'}`, color: activeTab === v ? '#3b82f6' : '#888', transition: 'all .2s', whiteSpace: 'nowrap' });
  const thStyle = { padding: '10px 12px', color: 'white', fontWeight: 700, fontSize: 12, textAlign: 'center', whiteSpace: 'nowrap' };
  const tdStyle = { padding: '9px 12px', fontSize: 13, color: '#333', textAlign: 'center', borderBottom: '1px solid #f0f0f0' };

  return (
    <div style={{ padding: '1.5rem', background: '#f5f5f5', minHeight: '100vh' }}>
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(16px) } to { opacity:1; transform:none } }
        .rc { animation: fadeUp .35s ease both }
      `}</style>

      <PrintDocument data={data} month={month} />

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <button onClick={() => navigate(-1)} style={{ padding: '8px 14px', background: '#f3f4f6', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 14, color: '#555' }}>← กลับ</button>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#1a1a2e', margin: 0 }}>📊 รายงานรายเดือน</h1>
          <p style={{ color: '#999', margin: '0.2rem 0 0', fontSize: '0.85rem' }}>สรุปการรับเข้าและเบิกออกตลอดเดือน พร้อมรายละเอียดความเคลื่อนไหว</p>
        </div>
      </div>

      <div className="rc" style={{ background: 'white', borderRadius: 12, padding: '1rem 1.25rem', marginBottom: '1.25rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.06em' }}>📅 เลือกเดือน</span>
        <input type="month" value={month} onChange={e => setMonth(e.target.value)} style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, outline: 'none' }} />
        <button onClick={() => fetchReport(month)} style={{ padding: '8px 18px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>🔍 ดูข้อมูล</button>
        {data && <>
          <button onClick={exportExcel} style={{ padding: '8px 14px', background: '#10b981', color: 'white', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer', marginLeft: 'auto' }}>📥 Excel</button>
          <button onClick={handlePrint} style={{ padding: '8px 14px', background: '#ef4444', color: 'white', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>🖨️ พิมพ์</button>
        </>}
      </div>

      {loading && <div style={{ textAlign: 'center', padding: '3rem', color: '#888' }}>⏳ กำลังโหลด...</div>}

      {!loading && data && (
        <div>
          <div className="rc" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(170px,1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
            <StatCard color="#3b82f6" icon="📥" label="รายการรับเข้า"      value={fmtNum(data.summary.total_received_items, 0)} sub="รายการ" />
            <StatCard color="#10b981" icon="⚖️" label="น้ำหนักรับเข้า"     value={fmtNum(data.summary.total_received_g / 1000)} sub="กิโลกรัม" />
            <StatCard color="#ef4444" icon="📤" label="วัตถุดิบที่เบิกมาก" value={data.top_withdrawn[0]?.name || '-'} sub={data.top_withdrawn[0] ? `${fmtNum(data.top_withdrawn[0].withdrawn_g / 1000, 1)} kg` : ''} />
            <StatCard color="#8b5cf6" icon="🏆" label="หมวดที่รับมาก"      value={data.by_category[0]?.category || '-'} sub={data.by_category[0] ? `${fmtNum(data.by_category[0].received_g / 1000, 1)} kg` : ''} />
            <StatCard color="#f59e0b" icon="🔄" label="ความเคลื่อนไหวรวม"  value={fmtNum(allMovements.length, 0)} sub="รายการ" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
            <div className="rc" style={{ background: 'white', borderRadius: 12, padding: '1.25rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
              <h3 style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: 700, color: '#1a1a2e' }}>📊 รับเข้า vs เบิกออก รายวัน</h3>
              <DailyBarChart data={data.daily} />
            </div>
            <div className="rc" style={{ background: 'white', borderRadius: 12, padding: '1.25rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
              <h3 style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: 700, color: '#1a1a2e' }}>🏆 Top 10 วัตถุดิบที่เบิกมากสุด</h3>
              <TopBar data={data.top_withdrawn} />
            </div>
          </div>
          <div className="rc" style={{ background: 'white', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
            <div style={{ display: 'flex', borderBottom: '2px solid #e5e7eb', overflowX: 'auto' }}>
              <button style={tabStyle('movement')}  onClick={() => setActiveTab('movement')}>🔄 ความเคลื่อนไหว ({allMovements.length})</button>
              <button style={tabStyle('daily')}     onClick={() => setActiveTab('daily')}>📅 รายวัน ({data.daily.length})</button>
              <button style={tabStyle('category')}  onClick={() => setActiveTab('category')}>📂 หมวดหมู่</button>
              <button style={tabStyle('top')}       onClick={() => setActiveTab('top')}>🏆 Top 10</button>
            </div>
            {activeTab === 'movement' && (
              <div style={{ padding: '1rem' }}>
                <div style={{ display: 'flex', gap: 8, marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                  <input type="text" placeholder="🔍 ค้นหาชื่อหรือรหัส..." value={movSearch} onChange={e => setMovSearch(e.target.value)} style={{ flex: 1, minWidth: 180, padding: '7px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 13, outline: 'none' }} />
                  {[['ทั้งหมด','all'],['📥 รับเข้า','receive'],['📤 เบิกออก','withdraw']].map(([label, val]) => (
                    <button key={val} onClick={() => setMovFilter(val)} style={{ padding: '7px 14px', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 12, background: movFilter === val ? '#3b82f6' : '#f3f4f6', color: movFilter === val ? 'white' : '#666' }}>{label}</button>
                  ))}
                  <span style={{ fontSize: 12, color: '#aaa', marginLeft: 'auto' }}>{filteredMovements.length} รายการ</span>
                </div>
                <Timeline items={filteredMovements} />
              </div>
            )}
            <div style={{ padding: activeTab !== 'movement' ? '1rem' : 0, overflowX: 'auto' }}>
              {activeTab === 'daily' && (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead><tr style={{ background: '#1e293b' }}>{['วันที่','รับเข้า (ก.)','เบิกออก (ก.)','สุทธิ (ก.)'].map(h => <th key={h} style={thStyle}>{h}</th>)}</tr></thead>
                  <tbody>
                    {data.daily.map((d, i) => { const net = +d.received_g - +d.withdrawn_g; return (
                      <tr key={i} style={{ background: i % 2 === 0 ? 'white' : '#f9fafb' }}>
                        <td style={tdStyle}><strong>{d.date}</strong></td>
                        <td style={{ ...tdStyle, color: '#3b82f6', fontWeight: +d.received_g > 0 ? 700 : 400 }}>{fmtNum(d.received_g)}</td>
                        <td style={{ ...tdStyle, color: '#ef4444', fontWeight: +d.withdrawn_g > 0 ? 700 : 400 }}>{fmtNum(d.withdrawn_g)}</td>
                        <td style={{ ...tdStyle, color: net >= 0 ? '#10b981' : '#ef4444', fontWeight: 700 }}>{net >= 0 ? '+' : ''}{fmtNum(net)}</td>
                      </tr>
                    );})}
                    <tr style={{ background: '#f0f9ff' }}>
                      <td style={{ ...tdStyle, fontWeight: 800 }}>รวม</td>
                      <td style={{ ...tdStyle, fontWeight: 800, color: '#3b82f6' }}>{fmtNum(data.daily.reduce((s, d) => s + +d.received_g, 0))}</td>
                      <td style={{ ...tdStyle, fontWeight: 800, color: '#ef4444' }}>{fmtNum(data.daily.reduce((s, d) => s + +d.withdrawn_g, 0))}</td>
                      <td style={{ ...tdStyle, fontWeight: 800, color: '#10b981' }}>{(() => { const n = data.daily.reduce((s, d) => s + +d.received_g - +d.withdrawn_g, 0); return (n >= 0 ? '+' : '') + fmtNum(n); })()}</td>
                    </tr>
                  </tbody>
                </table>
              )}
              {activeTab === 'category' && (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead><tr style={{ background: '#1e293b' }}>{['หมวดหมู่','รับเข้า (ก.)','เบิกออก (ก.)','สุทธิ (ก.)'].map(h => <th key={h} style={{ ...thStyle, textAlign: h === 'หมวดหมู่' ? 'left' : 'right' }}>{h}</th>)}</tr></thead>
                  <tbody>
                    {data.by_category.map((d, i) => { const net = +d.received_g - +d.withdrawn_g; return (
                      <tr key={i} style={{ background: i % 2 === 0 ? 'white' : '#f9fafb' }}>
                        <td style={{ ...tdStyle, textAlign: 'left' }}><span style={{ background: '#e0f2fe', color: '#0369a1', padding: '2px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>{d.category}</span></td>
                        <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700, color: '#3b82f6' }}>{fmtNum(d.received_g)}</td>
                        <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700, color: '#ef4444' }}>{fmtNum(d.withdrawn_g)}</td>
                        <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700, color: net >= 0 ? '#10b981' : '#ef4444' }}>{net >= 0 ? '+' : ''}{fmtNum(net)}</td>
                      </tr>
                    );})}
                  </tbody>
                </table>
              )}
              {activeTab === 'top' && (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead><tr style={{ background: '#1e293b' }}>{['#','ชื่อวัตถุดิบ','หมวดหมู่','เบิกรวม (ก.)','จำนวนครั้ง','% ของรับเข้า'].map(h => <th key={h} style={thStyle}>{h}</th>)}</tr></thead>
                  <tbody>
                    {data.top_withdrawn.length === 0
                      ? <tr><td colSpan={6} style={{ padding: 24, textAlign: 'center', color: '#ccc', fontStyle: 'italic' }}>ไม่มีการเบิกในเดือนนี้</td></tr>
                      : data.top_withdrawn.map((d, i) => { const pct = ((+d.withdrawn_g / (data.summary.total_received_g || 1)) * 100).toFixed(1); return (
                        <tr key={i} style={{ background: i % 2 === 0 ? 'white' : '#f9fafb' }}>
                          <td style={tdStyle}><span style={{ background: i < 3 ? '#fef3c7' : '#f3f4f6', color: i < 3 ? '#d97706' : '#999', borderRadius: 6, padding: '2px 8px', fontWeight: 800, fontSize: 13 }}>#{i + 1}</span></td>
                          <td style={{ ...tdStyle, fontWeight: 700, textAlign: 'left' }}>{d.name}</td>
                          <td style={tdStyle}><span style={{ background: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>{d.category}</span></td>
                          <td style={{ ...tdStyle, fontWeight: 700, color: '#ef4444' }}>{fmtNum(d.withdrawn_g)}</td>
                          <td style={tdStyle}>{d.withdraw_count} ครั้ง</td>
                          <td style={tdStyle}><span style={{ background: +pct > 20 ? '#fee2e2' : '#f3f4f6', color: +pct > 20 ? '#dc2626' : '#666', borderRadius: 20, padding: '2px 8px', fontSize: 12, fontWeight: 700 }}>{pct}%</span></td>
                        </tr>
                      );})}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
      {!loading && !data && (
        <div style={{ textAlign: 'center', padding: '4rem', color: '#ccc' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📭</div>
          <p>เลือกเดือนแล้วกด "ดูข้อมูล"</p>
        </div>
      )}
    </div>
  );
};

const Timeline = ({ items }) => {
  if (!items.length) return <div style={{ textAlign: 'center', padding: '2.5rem', color: '#ccc' }}><div style={{ fontSize: 36, marginBottom: 8 }}>📭</div><p style={{ margin: 0 }}>ไม่มีรายการความเคลื่อนไหว</p></div>;
  const fmtTime = (str) => { if (!str) return ''; try { return new Date(str).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }); } catch { return ''; } };
  return (
    <div style={{ position: 'relative', paddingLeft: 4 }}>
      {items.map((item, i) => {
        const isIn = item.type === 'receive';
        return (
          <div key={i} style={{ display: 'flex', gap: 14, position: 'relative', marginBottom: 12 }}>
            {i < items.length - 1 && <div style={{ position: 'absolute', left: 19, top: 42, width: 2, height: 'calc(100% + 0px)', background: '#e5e7eb', zIndex: 0 }} />}
            <div style={{ flexShrink: 0, width: 40, height: 40, borderRadius: '50%', background: isIn ? '#dbeafe' : '#fee2e2', border: `2px solid ${isIn ? '#3b82f6' : '#ef4444'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, zIndex: 1, marginTop: 2 }}>{isIn ? '📥' : '📤'}</div>
            <div style={{ flex: 1, background: isIn ? '#fafcff' : '#fffafa', borderRadius: 10, padding: '10px 14px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: `1px solid ${isIn ? '#bfdbfe' : '#fecaca'}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 800, fontSize: 14, color: '#1a1a2e' }}>{item.name}</span>
                  <span style={{ fontSize: 11, background: '#e0f2fe', color: '#0369a1', borderRadius: 20, padding: '2px 8px', fontWeight: 700 }}>{item.category}</span>
                  <span style={{ fontSize: 11, background: isIn ? '#dbeafe' : '#fee2e2', color: isIn ? '#1d4ed8' : '#dc2626', borderRadius: 20, padding: '2px 8px', fontWeight: 700 }}>{isIn ? '📥 รับเข้า' : '📤 เบิกออก'}</span>
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

export default WarehouseReportMonthly;