import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import html2canvas from "html2canvas";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000";

const STATUS_CONFIG = {
  IN_STOCK:  { label: "มีในคลัง",   color: "#16a34a", bg: "#dcfce7", dot: "#22c55e" },
  WITHDRAWN: { label: "เบิกออกแล้ว", color: "#dc2626", bg: "#fee2e2", dot: "#ef4444" },
};

const LOGO = '/images/1212.jpg';

export default function PublicIngredient() {
  const { code } = useParams();
  const [item, setItem]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [saving, setSaving]   = useState(false);

  useEffect(() => {
    if (!code) { setError("ไม่พบรหัสสินค้า"); setLoading(false); return; }
    const url = `${API_BASE}/api/public/ingredient/${code}`;
    fetch(url)
      .then(r => r.json())
      .then(data => {
        if (data.success) setItem(data.item);
        else setError(data.error || "ไม่พบข้อมูล");
      })
      .catch(err => setError(`❌ ${err.message} | URL: ${url}`))
      .finally(() => setLoading(false));
  }, [code]);

  const handleDownload = async () => {
  setSaving(true);
  try {
    const el = document.querySelector('.pi-card');

    // บังคับสีดำทุก element ก่อน capture
    const allEls = el.querySelectorAll('*');
    const origColors = [];
    allEls.forEach(n => {
      origColors.push(n.style.color);
      const computed = window.getComputedStyle(n).color;
      // ถ้าสีอ่อน (เทา) ให้เปลี่ยนเป็นดำ
      if (computed !== 'rgb(255, 255, 255)') {
        n.style.color = '#000000';
      }
    });

    const canvas = await html2canvas(el, {
      scale: 3,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
    });

    // คืนค่าสีเดิม
    allEls.forEach((n, i) => {
      n.style.color = origColors[i];
    });

    const link = document.createElement('a');
    link.download = `${item.inventory_code}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  } catch (e) {
    alert('บันทึกรูปไม่สำเร็จ');
  } finally {
    setSaving(false);
  }
};

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Thai:wght@300;400;500;600;700&family=JetBrains+Mono:wght@500;700&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #f0f2f5; }

        .pi-page {
          min-height: 100vh;
          background: linear-gradient(160deg, #f8fafc 0%, #e8edf5 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px 16px;
          font-family: 'Noto Sans Thai', sans-serif;
        }

        .pi-card {
          background: #ffffff;
          border-radius: 24px;
          width: 100%;
          max-width: 420px;
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.07), 0 20px 60px -10px rgba(0,0,0,0.12);
          overflow: hidden;
          animation: cardIn .45s cubic-bezier(.22,1,.36,1) both;
        }

        @keyframes cardIn {
          from { opacity: 0; transform: translateY(28px) scale(.97); }
          to   { opacity: 1; transform: none; }
        }

        .pi-header {
          background: #111827;
          padding: 28px 28px 24px;
          position: relative;
          overflow: hidden;
        }
        .pi-header::after {
          content: '';
          position: absolute;
          inset: 0;
          background: radial-gradient(ellipse at 80% 50%, rgba(255,255,255,0.04) 0%, transparent 60%);
          pointer-events: none;
        }
        .pi-header-label {
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: .12em;
          color: #ffffff;
          text-transform: uppercase;
          margin-bottom: 10px;
        }
        .pi-brand {
          font-family: 'JetBrains Mono', monospace;
          font-size: 11px;
          color: #ffffff;
          font-weight: 700;
          letter-spacing: .06em;
          margin-top: 10px;
        }
        .pi-code {
          font-family: 'JetBrains Mono', monospace;
          font-size: 26px;
          font-weight: 700;
          color: #ffffff;
          letter-spacing: .04em;
          line-height: 1;
        }

        .pi-body { padding: 24px 28px 28px; }

        .pi-product-row {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 16px 0 20px;
          border-bottom: 2px solid #111827;
        }
        .pi-emoji {
          width: 52px; height: 52px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
          overflow: hidden;
        }
        .pi-product-name {
          font-size: 22px;
          font-weight: 700;
          color: #000000;
          line-height: 1.2;
        }
        .pi-product-cat {
          font-size: 13px;
          color: #000000;
          font-weight: 700;
          margin-top: 3px;
        }

        .pi-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-top: 20px;
        }
        .pi-cell {
          background: #f1f5f9;
          border: 1.5px solid #334155;
          border-radius: 14px;
          padding: 14px 16px;
        }
        .pi-cell-label {
          font-size: 11px;
          font-weight: 700;
          color: #000000;
          letter-spacing: .06em;
          text-transform: uppercase;
          margin-bottom: 6px;
        }
        .pi-cell-value {
          font-size: 16px;
          font-weight: 700;
          color: #000000;
          font-family: 'JetBrains Mono', monospace;
        }
        .pi-cell-unit {
          font-size: 12px;
          font-weight: 700;
          color: #000000;
          font-family: 'Noto Sans Thai', sans-serif;
          margin-left: 2px;
        }

        .pi-status {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          margin-top: 20px;
          padding: 10px 16px;
          border-radius: 100px;
          font-size: 14px;
          font-weight: 700;
          width: 100%;
          justify-content: center;
        }
        .pi-status-dot {
          width: 8px; height: 8px;
          border-radius: 50%;
        }

        .pi-footer {
          border-top: 2px solid #111827;
          padding: 16px 28px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .pi-footer-brand {
          font-family: 'JetBrains Mono', monospace;
          font-size: 11px;
          color: #000000;
          font-weight: 700;
          letter-spacing: .06em;
        }

        .pi-state { text-align: center; padding: 60px 32px; }
        .pi-spinner {
          width: 40px; height: 40px;
          border: 3px solid #e2e8f0;
          border-top-color: #111827;
          border-radius: 50%;
          margin: 0 auto 16px;
          animation: spin 1s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .pi-state-title { font-size: 16px; font-weight: 600; color: #374151; }
        .pi-state-sub { font-size: 13px; color: #6b7280; margin-top: 6px; }
        .pi-error-icon { font-size: 40px; margin-bottom: 12px; }
      `}</style>

      <div className="pi-page">
        <div className="pi-card">

          {loading && (
            <div className="pi-state">
              <div className="pi-spinner" />
              <div className="pi-state-title">กำลังโหลดข้อมูล...</div>
              <div className="pi-state-sub">รหัส: {code}</div>
            </div>
          )}

          {!loading && error && (
            <div className="pi-state">
              <div className="pi-error-icon">🔍</div>
              <div className="pi-state-title">ไม่พบข้อมูล</div>
              <div className="pi-state-sub">{error}</div>
              <div className="pi-state-sub" style={{ marginTop: 8, fontSize: 11, wordBreak: 'break-all', color: 'red' }}>
                API_BASE: {API_BASE}
              </div>
              <div className="pi-state-sub" style={{ fontSize: 11, wordBreak: 'break-all' }}>
                Code: {code}
              </div>
            </div>
          )}

          {!loading && item && (() => {
            const status = STATUS_CONFIG[item.status] || STATUS_CONFIG.IN_STOCK;
            return (
              <>
                <div className="pi-header">
                  <div className="pi-header-label">BIGURI · Ingredient QR</div>
                  <div className="pi-code">{item.inventory_code}</div>
                  <div className="pi-brand">BIGURI Premium Japanese Food</div>
                </div>

                <div className="pi-body">
                  <div className="pi-product-row">
                    <div className="pi-emoji">
                      <img src={LOGO} alt="logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                    <div>
                      <div className="pi-product-name">{item.name}</div>
                      <div className="pi-product-cat">{item.category}</div>
                    </div>
                  </div>

                  <div className="pi-grid">
                    <div className="pi-cell">
                      <div className="pi-cell-label">น้ำหนัก</div>
                      <div className="pi-cell-value">
                        {Number(item.weight).toLocaleString()}
                        <span className="pi-cell-unit">ก.</span>
                      </div>
                    </div>
                    <div className="pi-cell">
                      <div className="pi-cell-label">วันที่ผลิต</div>
                      <div className="pi-cell-value" style={{ fontSize: 13 }}>
                        {item.receive_date
                          ? new Date(item.receive_date).toLocaleDateString("th-TH", { year: "numeric", month: "short", day: "numeric" })
                          : "-"}
                      </div>
                    </div>
                    <div className="pi-cell" style={{ gridColumn: "span 2" }}>
                      <div className="pi-cell-label">รหัสสินค้า</div>
                      <div className="pi-cell-value" style={{ fontSize: 18, letterSpacing: ".06em" }}>
                        {item.inventory_code}
                      </div>
                    </div>
                  </div>

                  <div className="pi-status" style={{ background: status.bg, color: status.color }}>
                    <div className="pi-status-dot" style={{ background: status.dot }} />
                    {status.label}
                  </div>
                </div>

                <div className="pi-footer">
                  <div className="pi-footer-brand">BIGURI Premium Japanese Food</div>
                  <button
                    onClick={handleDownload}
                    disabled={saving}
                    style={{
                      background: '#111827', color: '#fff', border: 'none',
                      borderRadius: 8, padding: '6px 14px', fontSize: 13,
                      fontWeight: 700, cursor: saving ? 'wait' : 'pointer',
                      fontFamily: "'JetBrains Mono', monospace",
                      opacity: saving ? 0.6 : 1,
                    }}
                  >
                    {saving ? '⏳ กำลังบันทึก...' : '⬇ บันทึกรูป'}
                  </button>
                </div>
              </>
            );
          })()}

        </div>
      </div>
    </>
  );
}
