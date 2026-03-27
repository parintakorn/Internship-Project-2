import { useState, useEffect, useRef } from "react";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000";

const fmt = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
};

const CATEGORY_LETTER = {
  "อาหารทะเล": "A",
  "หมู":       "M",
  "เนื้อ":     "B",
  "ไก่":       "C",
  "ผัก":       "V",
  "เครื่องเทศ":"S",
  "อื่นๆ":     "X",
};

const buildPrefixForProduct = (product, allProducts) => {
  if (!product) return "";
  const catLetter = CATEGORY_LETTER[product.category] || "X";
  const sameCategory = [...allProducts]
    .filter((p) => p.category === product.category)
    .sort((a, b) => Number(a.id) - Number(b.id));
  const idx = sameCategory.findIndex((p) => String(p.id) === String(product.id));
  const seqLetter = idx >= 0 ? String.fromCharCode(65 + idx) : "A";
  return `${catLetter}${seqLetter}D`;
};

const calcNextSeq = (prefixCode, allInventory) => {
  if (!prefixCode || !allInventory?.length) return "000001";
  const prefix = (prefixCode + "-").toUpperCase();
  let max = 0;
  allInventory.forEach((item) => {
    const code = (item.code || "").toUpperCase();
    if (code.startsWith(prefix)) {
      const numPart = code.slice(prefix.length);
      const num = parseInt(numPart, 10);
      if (!isNaN(num) && num > max) max = num;
    }
  });
  return String(max + 1).padStart(6, "0");
};

const Toast = ({ msg, type, onClose }) => {
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [msg]);
  if (!msg) return null;
  return (
    <div style={{
      position: "fixed", top: 24, right: 24, zIndex: 9999,
      background: type === "error" ? "#ff4d4d" : "#00c97a",
      color: "#fff", borderRadius: 12, padding: "14px 22px",
      fontWeight: 600, fontSize: 15, boxShadow: "0 8px 32px rgba(0,0,0,0.22)",
      animation: "slideIn .3s ease", display: "flex", alignItems: "center", gap: 10,
    }}>
      <span>{type === "error" ? "⚠️" : "✅"}</span>
      {msg}
      <button onClick={onClose} style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", fontSize: 18, marginLeft: 6 }}>×</button>
    </div>
  );
};

const Modal = ({ open, onClose, title, children, accentColor = "#6c63ff" }) => {
  if (!open) return null;
  return (
    <div
      onClick={(e) => e.target === e.currentTarget && onClose()}
      style={{
        position: "fixed", inset: 0, background: "rgba(10,10,20,0.55)",
        zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center",
        backdropFilter: "blur(4px)", padding: 16,
      }}
    >
      <div style={{
        background: "#13141f", borderRadius: 20, padding: "36px 32px",
        maxWidth: 560, width: "100%", maxHeight: "90vh", overflowY: "auto",
        border: `1px solid ${accentColor}33`, boxShadow: `0 0 60px ${accentColor}22`,
        animation: "modalIn .25s ease",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h2 style={{ margin: 0, fontSize: 20, color: accentColor }}>{title}</h2>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.08)", border: "none", color: "#fff", width: 34, height: 34, borderRadius: 8, cursor: "pointer", fontSize: 18 }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
};

const Field = ({ label, children }) => (
  <div style={{ marginBottom: 18 }}>
    <label style={{ display: "block", fontSize: 13, color: "#8b8fa8", fontWeight: 600, marginBottom: 6, letterSpacing: "0.04em" }}>
      {label}
    </label>
    {children}
  </div>
);

const inputStyle = {
  width: "100%", padding: "11px 14px",
  background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 10, color: "#fff", fontSize: 15,
  fontFamily: "'Kanit', sans-serif", outline: "none",
  boxSizing: "border-box", transition: "border-color .2s",
  colorScheme: "dark",
};

const Btn = ({ children, onClick, color = "#6c63ff", style: s = {}, type = "button", disabled }) => (
  <button
    type={type} onClick={onClick} disabled={disabled}
    style={{
      width: "100%", padding: "13px 0", border: "none", borderRadius: 12,
      background: disabled ? "#333" : color, color: "#fff",
      fontFamily: "'Kanit', sans-serif", fontWeight: 700, fontSize: 16,
      cursor: disabled ? "not-allowed" : "pointer", transition: "all .2s", ...s,
    }}
    onMouseEnter={e => !disabled && (e.currentTarget.style.filter = "brightness(1.12)")}
    onMouseLeave={e => (e.currentTarget.style.filter = "none")}
  >
    {children}
  </button>
);

const Spinner = () => (
  <div style={{ textAlign: "center", padding: 40, color: "#6c63ff" }}>
    <div style={{ width: 44, height: 44, border: "3px solid #222", borderTop: "3px solid #6c63ff", borderRadius: "50%", margin: "0 auto 12px", animation: "spin 1s linear infinite" }} />
    <p style={{ margin: 0, color: "#8b8fa8" }}>กำลังประมวลผล...</p>
  </div>
);

const PrefixBreakdown = ({ prefix, category }) => {
  if (!prefix || prefix.length < 3) return null;
  const parts = [
    { char: prefix[0], label: "หมวดหมู่", sub: category || "" },
    { char: prefix[1], label: "ลำดับสินค้า", sub: "A=ตัวแรก, B=ตัวสอง..." },
    { char: prefix[2], label: "Order", sub: "คงที่" },
  ];
  return (
    <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
      {parts.map((p, i) => (
        <div key={i} style={{ flex: 1, textAlign: "center" }}>
          <div style={{
            fontSize: 22, fontWeight: 800, fontFamily: "'JetBrains Mono', monospace",
            color: "#a78bfa", background: "rgba(108,99,255,0.15)",
            border: "1px solid rgba(108,99,255,0.35)", borderRadius: 10,
            padding: "8px 0", letterSpacing: 2,
          }}>{p.char}</div>
          <div style={{ fontSize: 10, color: "#6b7094", marginTop: 4, lineHeight: 1.3 }}>{p.label}</div>
          <div style={{ fontSize: 10, color: "#444", lineHeight: 1.3 }}>{p.sub}</div>
        </div>
      ))}
    </div>
  );
};

const authHeaders = () => {
  const token = localStorage.getItem("token") || "";
  return { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
};

const generateQRWithInfo = async (result) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const padding        = 48;
      const qrSize         = 480;
      const infoPanelWidth = 520;
      const gap            = 40;
      const canvasW        = padding + qrSize + gap + infoPanelWidth + padding;
      const canvasH        = 700;

      const canvas  = document.createElement("canvas");
      const scale   = 3;
      canvas.width  = canvasW * scale;
      canvas.height = canvasH * scale;
      const ctx = canvas.getContext("2d");
      ctx.scale(scale, scale);

      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.roundRect(0, 0, canvasW, canvasH, 24);
      ctx.fill();

      ctx.strokeStyle = "rgba(0,0,0,0.1)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(0, 0, canvasW, canvasH, 24);
      ctx.stroke();

      const qrTop = (canvasH - qrSize) / 2;
      ctx.fillStyle = "#f4f4f4";
      ctx.beginPath();
      ctx.roundRect(padding - 16, qrTop - 16, qrSize + 32, qrSize + 32, 20);
      ctx.fill();

      ctx.strokeStyle = "rgba(0,0,0,0.12)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(padding - 16, qrTop - 16, qrSize + 32, qrSize + 32, 20);
      ctx.stroke();

      ctx.drawImage(img, padding, qrTop, qrSize, qrSize);

      const divX = padding + qrSize + gap / 2;
      const grad = ctx.createLinearGradient(divX, padding, divX, canvasH - padding);
      grad.addColorStop(0, "rgba(0,0,0,0)");
      grad.addColorStop(0.3, "rgba(0,0,0,0.15)");
      grad.addColorStop(0.7, "rgba(0,0,0,0.15)");
      grad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.strokeStyle = grad;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(divX, padding);
      ctx.lineTo(divX, canvasH - padding);
      ctx.stroke();

      const infoX = padding + qrSize + gap;
      const infoY = padding;
      const infoW = infoPanelWidth;

      ctx.fillStyle = "#111111";
      ctx.font = "700 35px 'JetBrains Mono', monospace";
      ctx.fillText("INGREDIENT QR", infoX, infoY + 30);

      ctx.fillStyle = "#111111";
      ctx.font = "800 47px 'JetBrains Mono', monospace";
      const idText = result.inventoryId || "";
      ctx.fillText(idText, infoX, infoY + 100);

      ctx.strokeStyle = "rgba(0,0,0,0.15)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(infoX, infoY + 118);
      ctx.lineTo(infoX + infoW, infoY + 118);
      ctx.stroke();

      const rows = [
        { label: "ประเภท",      value: result.productName || "-" },
        { label: "น้ำหนัก",     value: (result.weight || "-") + " กรัม" },
        { label: "วันที่ผลิต", value: result.receiveDate || "-" },
      ];

      let rowY = infoY + 158;
      rows.forEach(({ label, value }) => {
        ctx.fillStyle = "#111111";
        ctx.font = "600 35px 'Arial', sans-serif";
        ctx.fillText(label, infoX, rowY);

        ctx.fillStyle = "#111111";
        ctx.font = "700 45px 'Arial', sans-serif";
        let displayValue = value;
        while (ctx.measureText(displayValue).width > infoW - 4 && displayValue.length > 4) {
          displayValue = displayValue.slice(0, -1);
        }
        if (displayValue !== value) displayValue += "…";
        ctx.fillText(displayValue, infoX, rowY + 44);

        ctx.strokeStyle = "rgba(0,0,0,0.08)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(infoX, rowY + 62);
        ctx.lineTo(infoX + infoW, rowY + 62);
        ctx.stroke();

        rowY += 128;
      });

      const badgeY = canvasH - padding - 72;
      ctx.fillStyle = "rgba(0,0,0,0.05)";
      ctx.beginPath();
      ctx.roundRect(infoX, badgeY, infoW, 68, 22);
      ctx.fill();
      ctx.strokeStyle = "rgba(0,0,0,0.15)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(infoX, badgeY, infoW, 68, 22);
      ctx.stroke();

      ctx.textAlign = "center";
      ctx.fillStyle = "#111111";
      ctx.font = "800 40px 'JetBrains Mono', monospace";
      ctx.fillText("BIGURI", infoX + infoW / 2, badgeY + 28);
      ctx.fillStyle = "#111111";
      ctx.font = "500 30px 'JetBrains Mono', monospace";
      ctx.fillText("Premium Japanese Food", infoX + infoW / 2, badgeY + 54);
      ctx.textAlign = "left";

      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Canvas toBlob failed"));
      }, "image/png");
    };
    img.onerror = () => reject(new Error("Failed to load QR image"));
    img.src = result.qrUrl;
  });
};

export default function IngredientQRManager() {
  const [view, setView]         = useState("form");
  const [products, setProducts] = useState([]);
  const [allInventory, setAllInventory] = useState([]);
  const [result, setResult]     = useState(null);
  const [toast, setToast]       = useState({ msg: "", type: "success" });
  const [modal, setModal]       = useState(null);
  const [searchText, setSearchText] = useState("");
  const [downloading, setDownloading] = useState(false);

  const [form, setForm] = useState({
    productId:   "",
    prefixCode:  "",
    weight:      "",
    receiveDate: fmt(new Date()),
    previewCode: "",
  });

  const [addProductForm, setAddProductForm] = useState({ name: "", category: "" });

  const [withdrawSearch, setWithdrawSearch] = useState("");
  const [withdrawItem,   setWithdrawItem]   = useState(null);
  const [withdrawForm,   setWithdrawForm]   = useState({ amount: "", reason: "" });

  const showToast = (msg, type = "success") => setToast({ msg, type });
  const closeModal = () => setModal(null);

  const apiFetch = async (url, opts = {}) => {
    const res = await fetch(`${API_BASE}${url}`, { headers: authHeaders(), ...opts });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || err.message || `HTTP ${res.status}`);
    }
    return res.json();
  };

  const loadProducts = async () => {
    try {
      const data = await apiFetch("/api/admin/warehouse/ingredients");
      setProducts(Array.isArray(data) ? data : []);
    } catch (err) { showToast("โหลดวัตถุดิบไม่สำเร็จ: " + err.message, "error"); }
  };

  const loadInventory = async () => {
    try {
      const data = await apiFetch("/api/admin/warehouse/inventory");
      setAllInventory(data.success ? data.inventory : (Array.isArray(data) ? data : []));
    } catch (err) { console.warn("inventory load failed:", err.message); }
  };

  useEffect(() => {
    loadProducts();
    loadInventory();
  }, []);

  const handleProductChange = (productId) => {
    const product = products.find((p) => String(p.id) === String(productId));
    if (!product) {
      setForm(prev => ({ ...prev, productId: "", prefixCode: "", previewCode: "" }));
      return;
    }
    const prefixCode  = buildPrefixForProduct(product, products);
    const nextSeq     = calcNextSeq(prefixCode, allInventory);
    const previewCode = prefixCode ? `${prefixCode}-${nextSeq}` : "";
    setForm(prev => ({ ...prev, productId, prefixCode, previewCode }));
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!form.prefixCode || !form.productId || !form.weight || !form.receiveDate) {
      showToast("กรุณากรอกข้อมูลให้ครบถ้วน", "error");
      return;
    }
    setView("loading");
    try {
      const data = await apiFetch("/api/admin/warehouse/generate-qr", {
        method: "POST",
        body: JSON.stringify({
          prefixCode:  form.prefixCode,
          productId:   form.productId,
          weight:      form.weight,
          receiveDate: form.receiveDate,
        }),
      });
      if (data.success) {
        setResult(data);
        setView("result");
        loadInventory();
      } else throw new Error(data.error);
    } catch (err) {
      showToast("เกิดข้อผิดพลาด: " + err.message, "error");
      setView("form");
    }
  };

  const handleDownloadQR = async () => {
    if (!result?.qrUrl) return;
    setDownloading(true);
    try {
      const blob = await generateQRWithInfo(result);
      const filename = `QR_${result.inventoryId || "code"}.png`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast(`ดาวน์โหลด ${filename} สำเร็จ! 🎉`);
    } catch (err) {
      console.error("Canvas download failed:", err);
      try {
        const response = await fetch(result.qrUrl);
        const blob = await response.blob();
        const filename = `QR_${result.inventoryId || "code"}.png`;
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast("ดาวน์โหลด QR สำเร็จ (ไม่มีข้อมูลประกอบ)");
      } catch {
        showToast("ดาวน์โหลดไม่สำเร็จ", "error");
      }
    } finally {
      setDownloading(false);
    }
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    try {
      const data = await apiFetch("/api/admin/warehouse/ingredients", {
        method: "POST",
        body: JSON.stringify(addProductForm),
      });
      if (data.success) {
        showToast("เพิ่มวัตถุดิบสำเร็จ!");
        setAddProductForm({ name: "", category: "" });
        await loadProducts();
        closeModal();
      } else throw new Error(data.error);
    } catch (err) { showToast(err.message, "error"); }
  };

  const handleDeleteProduct = async (id) => {
    if (!confirm("ยืนยันการลบวัตถุดิบ?")) return;
    try {
      await apiFetch(`/api/admin/warehouse/ingredients/${id}`, { method: "DELETE" });
      showToast("ลบวัตถุดิบสำเร็จ!");
      await loadProducts();
      if (String(form.productId) === String(id)) {
        setForm(prev => ({ ...prev, productId: "", prefixCode: "", previewCode: "" }));
      }
    } catch (err) { showToast(err.message, "error"); }
  };

  const handleWithdrawSearch = async () => {
    if (!withdrawSearch.trim()) { showToast("กรุณากรอกรหัส", "error"); return; }
    let searchCode = withdrawSearch.trim();
    try {
      const parsed = JSON.parse(searchCode);
      if (parsed.id) searchCode = parsed.id;
    } catch { /* ไม่ใช่ JSON */ }

    try {
      const data = await apiFetch("/api/admin/warehouse/search", {
        method: "POST",
        body: JSON.stringify({ code: searchCode }),
      });
      if (data.success) setWithdrawItem(data.item);
      else throw new Error(data.error);
    } catch (err) {
      showToast("ไม่พบข้อมูล: " + err.message, "error");
      setWithdrawItem(null);
    }
  };

  const handleWithdraw = async (e) => {
    e.preventDefault();
    try {
      const data = await apiFetch("/api/admin/warehouse/withdraw", {
        method: "POST",
        body: JSON.stringify({
          id:     withdrawItem.INVENTORY_ID,
          amount: withdrawForm.amount,
          reason: withdrawForm.reason,
        }),
      });
      if (data.success) {
        showToast("เบิกวัตถุดิบสำเร็จ!");
        setWithdrawItem(null);
        setWithdrawSearch("");
        setWithdrawForm({ amount: "", reason: "" });
        closeModal();
        loadInventory();
      } else throw new Error(data.error);
    } catch (err) { showToast(err.message, "error"); }
  };

  const categories = Object.keys(CATEGORY_LETTER);

  // ── helper: sort products by prefix (A→Z) within their category ──
  const sortedByPrefix = (list) =>
    [...list].sort((a, b) =>
      buildPrefixForProduct(a, products).localeCompare(
        buildPrefixForProduct(b, products)
      )
    );

  const filteredProducts = products.filter(
    (p) =>
      (p.name || "").toLowerCase().includes(searchText.toLowerCase()) ||
      (p.category || "").toLowerCase().includes(searchText.toLowerCase())
  );

  const selectedProduct = products.find((p) => String(p.id) === String(form.productId));
  const getProductPrefix = (product) => buildPrefixForProduct(product, products);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Kanit:wght@300;400;600;700&family=JetBrains+Mono:wght@600&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes slideIn { from { transform: translateX(60px); opacity: 0; } to { transform: none; opacity: 1; } }
        @keyframes modalIn { from { transform: translateY(-30px) scale(.97); opacity: 0; } to { transform: none; opacity: 1; } }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from { transform: translateY(20px); opacity: 0; } to { transform: none; opacity: 1; } }
        input:focus, select:focus, textarea:focus { border-color: #6c63ff !important; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #111; }
        ::-webkit-scrollbar-thumb { background: #333; border-radius: 3px; }
        select option { background-color: #1a1b2e !important; color: #e8e8f0 !important; }
        @media print {
          body * { visibility: hidden; }
          #print-area, #print-area * { visibility: visible; }
          #print-area { position: fixed; inset: 0; display: flex; align-items: center; justify-content: center; background: white; }
        }
      `}</style>

      <Toast msg={toast.msg} type={toast.type} onClose={() => setToast({ msg: "" })} />

      <div style={{ minHeight: "100vh", background: "#0b0c18", fontFamily: "'Kanit', sans-serif", color: "#e8e8f0", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "40px 16px" }}>
        <div style={{ width: "100%", maxWidth: 520, animation: "fadeUp .5s ease" }}>

          <div style={{ textAlign: "center", marginBottom: 36 }}>
            <div style={{ fontSize: 52, marginBottom: 10 }}>📦</div>
            <h1 style={{ fontSize: 28, fontWeight: 700, background: "linear-gradient(135deg, #6c63ff, #a78bfa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              QR Code Generator
            </h1>
            <p style={{ color: "#6b7094", marginTop: 4, fontSize: 15 }}>ระบบจัดการคลังวัตถุดิบ</p>

            <div style={{ display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap", marginTop: 12 }}>
              {Object.entries(CATEGORY_LETTER).map(([cat, letter]) => (
                <span key={cat} style={{ fontSize: 11, background: "rgba(108,99,255,0.12)", border: "1px solid rgba(108,99,255,0.25)", borderRadius: 6, padding: "2px 8px", color: "#8b8fa8" }}>
                  <span style={{ color: "#a78bfa", fontFamily: "monospace", fontWeight: 700 }}>{letter}</span> = {cat}
                </span>
              ))}
            </div>
          </div>

          <div style={{ background: "#13141f", borderRadius: 20, padding: "36px 32px", border: "1px solid rgba(108,99,255,0.2)", boxShadow: "0 0 80px rgba(108,99,255,0.08)" }}>

            {view === "loading" && <Spinner />}

            {view === "result" && result && (
              <div id="print-area" style={{ animation: "fadeUp .4s ease" }}>
                <div style={{ textAlign: "center", marginBottom: 24 }}>
                  <img
                    src={result.qrUrl} alt="QR Code"
                    style={{ width: 200, height: 200, borderRadius: 16, border: "4px solid rgba(108,99,255,0.3)", background: "white", padding: 8 }}
                  />
                </div>

                <div style={{ background: "rgba(108,99,255,0.08)", borderRadius: 12, padding: 20, marginBottom: 20, border: "1px solid rgba(108,99,255,0.2)" }}>
                  {[
                    ["รหัสวัตถุดิบ", result.inventoryId],
                    ["ประเภท",       result.productName],
                    ["น้ำหนัก",      result.weight + " กรัม"],
                    ["วันที่รับเข้า", result.receiveDate],
                  ].map(([k, v]) => (
                    <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                      <span style={{ color: "#8b8fa8", fontSize: 14 }}>{k}</span>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 14, color: "#a78bfa" }}>{v}</span>
                    </div>
                  ))}
                </div>

                <div style={{ background: "rgba(108,99,255,0.06)", border: "1px dashed rgba(108,99,255,0.3)", borderRadius: 10, padding: "10px 14px", marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 20 }}>🖼️</span>
                  <div>
                    <div style={{ fontSize: 12, color: "#a78bfa", fontWeight: 600 }}>ไฟล์ที่ดาวน์โหลดจะมีข้อมูลประกอบ (ความละเอียดสูง)</div>
                    <div style={{ fontSize: 11, color: "#6b7094", marginTop: 2 }}>QR Code + รหัส · ประเภท · น้ำหนัก · วันที่รับ</div>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <Btn color="#00c97a" onClick={() => window.print()} style={{ flex: 1, minWidth: 120 }}>🖨️ พิมพ์</Btn>
                  <Btn color="#6c63ff" onClick={handleDownloadQR} disabled={downloading} style={{ flex: 1, minWidth: 120 }}>
                    {downloading ? "⏳ กำลังสร้าง..." : "⬇️ ดาวน์โหลด"}
                  </Btn>
                  <Btn color="#444" onClick={() => { setView("form"); setResult(null); setForm(f => ({ ...f, weight: "" })); }} style={{ flex: 1, minWidth: 120 }}>← สร้างใหม่</Btn>
                </div>
              </div>
            )}

            {view === "form" && (
              <form onSubmit={handleGenerate} style={{ animation: "fadeUp .4s ease" }}>
                <Field label="ประเภทวัตถุดิบ">
                  <select value={form.productId} onChange={e => handleProductChange(e.target.value)} style={inputStyle} required>
                    <option value="">-- เลือกประเภท --</option>
                    {categories.map(cat => {
                      const inCat = products.filter(p => p.category === cat);
                      if (!inCat.length) return null;
                      // ── sort by prefix A→Z so dropdown shows AAD, ABD, ACD… ──
                      const sorted = sortedByPrefix(inCat);
                      return (
                        <optgroup key={cat} label={`${CATEGORY_LETTER[cat]} — ${cat}`}>
                          {sorted.map(p => (
                            <option key={p.id} value={p.id}>{getProductPrefix(p)} · {p.name}</option>
                          ))}
                        </optgroup>
                      );
                    })}
                    {products.filter(p => !CATEGORY_LETTER[p.category]).length > 0 && (
                      <optgroup label="X — อื่นๆ">
                        {sortedByPrefix(products.filter(p => !CATEGORY_LETTER[p.category])).map(p => (
                          <option key={p.id} value={p.id}>{getProductPrefix(p)} · {p.name}</option>
                        ))}
                      </optgroup>
                    )}
                  </select>
                </Field>

                {form.prefixCode && (
                  <div style={{ marginBottom: 18 }}>
                    <div style={{ fontSize: 12, color: "#6b7094", marginBottom: 8 }}>Prefix ที่ได้รับการกำหนดอัตโนมัติ:</div>
                    <PrefixBreakdown prefix={form.prefixCode} category={selectedProduct?.category} />
                  </div>
                )}

                {form.previewCode && (
                  <div style={{ background: "rgba(108,99,255,0.08)", border: "1px solid rgba(108,99,255,0.25)", borderRadius: 10, padding: "12px 14px", marginBottom: 18, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 13, color: "#8b8fa8" }}>รหัสที่จะได้</span>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 18, color: "#a78bfa", fontWeight: 700, letterSpacing: 2 }}>{form.previewCode}</span>
                  </div>
                )}

                <Field label="น้ำหนัก (กรัม)">
                  <input type="number" step="0.01" min="0.01" placeholder="0.00" value={form.weight} onChange={e => setForm(f => ({ ...f, weight: e.target.value }))} style={inputStyle} required />
                </Field>

                <Field label="วันที่รับเข้า">
                  <input type="date" value={form.receiveDate} onChange={e => setForm(f => ({ ...f, receiveDate: e.target.value }))} style={inputStyle} required />
                  <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                    {[["วันนี้", 0], ["เมื่อวาน", -1]].map(([label, offset]) => (
                      <button key={label} type="button" onClick={() => { const d = new Date(); d.setDate(d.getDate() + offset); setForm(f => ({ ...f, receiveDate: fmt(d) })); }}
                        style={{ flex: 1, padding: "8px 0", background: "rgba(108,99,255,0.15)", border: "1px solid rgba(108,99,255,0.3)", borderRadius: 8, color: "#a78bfa", cursor: "pointer", fontSize: 14, fontFamily: "'Kanit', sans-serif" }}>
                        {label}
                      </button>
                    ))}
                  </div>
                </Field>

                <Btn type="submit" color="linear-gradient(135deg,#6c63ff,#a78bfa)" style={{ marginTop: 8, marginBottom: 32 }}>✨ สร้าง QR Code</Btn>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  {[
                    ["➕ เพิ่มวัตถุดิบ", "#00c97a", "addProduct"],
                    ["📤 เบิกวัตถุดิบ", "#ff6b6b", "withdraw"],
                    ["🗑️ จัดการวัตถุดิบ", "#f59e0b", "manageProduct"],
                    ["📖 ดูตาราง Prefix", "#a78bfa", "prefixTable"],
                  ].map(([label, color, modalName]) => (
                    <button key={modalName} type="button" onClick={() => setModal(modalName)}
                      style={{ padding: "12px 0", background: `${color}18`, border: `1px solid ${color}44`, borderRadius: 12, color, cursor: "pointer", fontSize: 14, fontWeight: 600, fontFamily: "'Kanit', sans-serif", transition: "all .2s" }}
                      onMouseEnter={e => { e.currentTarget.style.background = `${color}30`; }}
                      onMouseLeave={e => { e.currentTarget.style.background = `${color}18`; }}>
                      {label}
                    </button>
                  ))}
                </div>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* ── Add Product Modal ── */}
      <Modal open={modal === "addProduct"} onClose={closeModal} title="➕ เพิ่มวัตถุดิบใหม่" accentColor="#00c97a">
        <form onSubmit={handleAddProduct}>
          <Field label="ชื่อวัตถุดิบ">
            <input value={addProductForm.name} onChange={e => setAddProductForm(f => ({ ...f, name: e.target.value }))} placeholder="เช่น แซลมอน" style={inputStyle} required />
          </Field>
          <Field label="หมวดหมู่">
            <select value={addProductForm.category} onChange={e => setAddProductForm(f => ({ ...f, category: e.target.value }))} style={inputStyle} required>
              <option value="">-- เลือกหมวดหมู่ --</option>
              {categories.map(c => <option key={c} value={c}>{CATEGORY_LETTER[c]} — {c}</option>)}
            </select>
          </Field>
          {addProductForm.name && addProductForm.category && (() => {
            // mockProduct ได้ id = MAX_SAFE_INTEGER → sort by id ทำให้อยู่ท้ายหมวดเสมอ
            const mockProduct = {
              id: Number.MAX_SAFE_INTEGER,
              name: addProductForm.name,
              category: addProductForm.category,
            };
            const mockProducts = [...products, mockProduct];
            const preview = buildPrefixForProduct(mockProduct, mockProducts);
            return (
              <div style={{ background: "rgba(0,201,122,0.08)", border: "1px solid rgba(0,201,122,0.25)", borderRadius: 10, padding: "10px 14px", marginBottom: 16 }}>
                <div style={{ fontSize: 12, color: "#6b7094", marginBottom: 4 }}>Prefix ที่จะได้รับ:</div>
                <div style={{ fontFamily: "monospace", fontSize: 20, color: "#00c97a", fontWeight: 700, letterSpacing: 3 }}>{preview}</div>
                <div style={{ fontSize: 11, color: "#6b7094", marginTop: 4 }}>
                  {CATEGORY_LETTER[addProductForm.category]} (หมวด) + {preview[1]} (ลำดับในหมวด) + D
                </div>
              </div>
            );
          })()}
          <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
            <Btn type="submit" color="#00c97a" style={{ flex: 1 }}>✓ บันทึก</Btn>
            <Btn color="#333" onClick={closeModal} style={{ flex: 1 }}>✕ ยกเลิก</Btn>
          </div>
        </form>
      </Modal>

      {/* ── Manage Product Modal ── */}
      <Modal open={modal === "manageProduct"} onClose={closeModal} title="🗑️ จัดการวัตถุดิบ" accentColor="#f59e0b">
        <input placeholder="🔍 ค้นหาชื่อหรือหมวดหมู่" style={{ ...inputStyle, marginBottom: 16 }} value={searchText} onChange={e => setSearchText(e.target.value)} />
        <div>
          {sortedByPrefix(
            filteredProducts.slice().sort((a, b) => {
              if (a.category !== b.category) return a.category.localeCompare(b.category, "th");
              return 0;
            })
          ).map(p => (
            <div key={p.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "13px 16px", background: "rgba(255,255,255,0.04)", borderRadius: 10, marginBottom: 8, border: "1px solid rgba(255,255,255,0.07)" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: "#a78bfa", background: "rgba(108,99,255,0.15)", padding: "2px 8px", borderRadius: 6, fontWeight: 700 }}>{getProductPrefix(p)}</span>
                  <span style={{ fontWeight: 600, color: "#e8e8f0", fontSize: 15 }}>{p.name}</span>
                </div>
                <div style={{ fontSize: 13, color: "#6b7094", marginTop: 2 }}>{CATEGORY_LETTER[p.category] || "X"} — {p.category || "ไม่ระบุ"}</div>
              </div>
              <button onClick={() => handleDeleteProduct(p.id)} style={{ background: "#ff4d4d22", border: "1px solid #ff4d4d55", color: "#ff6b6b", padding: "6px 14px", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>🗑️ ลบ</button>
            </div>
          ))}
          {filteredProducts.length === 0 && <p style={{ color: "#6b7094", textAlign: "center", padding: 24 }}>ไม่มีข้อมูลวัตถุดิบ</p>}
        </div>
        <Btn color="#333" onClick={closeModal} style={{ marginTop: 16 }}>✕ ปิด</Btn>
      </Modal>

      {/* ── Prefix Table Modal ── */}
      <Modal open={modal === "prefixTable"} onClose={closeModal} title="📖 ตาราง Prefix ทั้งหมด" accentColor="#a78bfa">
        <div style={{ marginBottom: 16, padding: "10px 14px", background: "rgba(108,99,255,0.08)", borderRadius: 10, fontSize: 13, color: "#8b8fa8", lineHeight: 1.8 }}>
          รูปแบบ: <span style={{ fontFamily: "monospace", color: "#a78bfa" }}>[หมวด][ลำดับ]D</span> — ลำดับตาม id ที่เพิ่มเข้าระบบ (ไม่เปลี่ยนแปลง)
        </div>
        {categories.map(cat => {
          const inCat = sortedByPrefix(products.filter(p => p.category === cat));
          if (!inCat.length) return null;
          return (
            <div key={cat} style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#6b7094", marginBottom: 6, display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontFamily: "monospace", fontSize: 15, color: "#a78bfa", background: "rgba(108,99,255,0.15)", padding: "1px 8px", borderRadius: 6 }}>{CATEGORY_LETTER[cat]}</span>
                {cat}
              </div>
              {inCat.map((p, i) => (
                <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: "rgba(255,255,255,0.03)", borderRadius: 8, marginBottom: 4, border: "1px solid rgba(255,255,255,0.05)" }}>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 15, color: "#a78bfa", fontWeight: 700, minWidth: 50 }}>{getProductPrefix(p)}</span>
                  <span style={{ fontSize: 14, color: "#e8e8f0" }}>{p.name}</span>
                  <span style={{ marginLeft: "auto", fontSize: 12, color: "#444" }}>ลำดับ {i + 1} → {String.fromCharCode(65 + i)}</span>
                </div>
              ))}
            </div>
          );
        })}
        {products.length === 0 && <p style={{ color: "#6b7094", textAlign: "center", padding: 24 }}>ยังไม่มีวัตถุดิบในระบบ</p>}
        <Btn color="#333" onClick={closeModal} style={{ marginTop: 8 }}>✕ ปิด</Btn>
      </Modal>

      {/* ── Withdraw Modal ── */}
      <Modal open={modal === "withdraw"} onClose={() => { closeModal(); setWithdrawItem(null); setWithdrawSearch(""); }} title="📤 เบิกวัตถุดิบออก" accentColor="#ff6b6b">
        <Field label="ค้นหาด้วย QR Code หรือรหัส">
          <div style={{ display: "flex", gap: 8 }}>
            <input value={withdrawSearch} onChange={e => setWithdrawSearch(e.target.value)} onKeyDown={e => e.key === "Enter" && handleWithdrawSearch()} placeholder="เช่น AAD-000001" style={{ ...inputStyle, flex: 1 }} />
            <button type="button" onClick={handleWithdrawSearch} style={{ padding: "11px 18px", background: "#ff6b6b", border: "none", borderRadius: 10, color: "#fff", cursor: "pointer", fontFamily: "'Kanit', sans-serif", fontWeight: 600 }}>🔍</button>
          </div>
        </Field>
        {withdrawItem && (
          <div style={{ background: "rgba(255,107,107,0.08)", borderRadius: 12, padding: 20, border: "1px solid rgba(255,107,107,0.2)", marginBottom: 20 }}>
            {[
              ["รหัส", withdrawItem.INVENTORY_CODE], ["ชื่อ", withdrawItem.PRODUCT_NAME],
              ["หมวดหมู่", withdrawItem.CATEGORY], ["น้ำหนัก", withdrawItem.WEIGHT + " กรัม"],
              ["วันที่รับ", withdrawItem.RECEIVE_DATE], ["สถานะ", withdrawItem.STATUS === "IN_STOCK" ? "✅ มีในคลัง" : "❌ เบิกแล้ว"],
            ].map(([k, v]) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <span style={{ color: "#8b8fa8", fontSize: 14 }}>{k}</span>
                <span style={{ fontSize: 14 }}>{v}</span>
              </div>
            ))}
            {withdrawItem.STATUS === "IN_STOCK" && (
              <form onSubmit={handleWithdraw} style={{ marginTop: 16 }}>
                <Field label="จำนวนที่เบิก (กรัม)">
                  <input type="number" step="0.01" min="0.01" max={withdrawItem.WEIGHT} value={withdrawForm.amount} onChange={e => setWithdrawForm(f => ({ ...f, amount: e.target.value }))} placeholder={`สูงสุด ${withdrawItem.WEIGHT} กรัม`} style={inputStyle} required />
                </Field>
                <Field label="เหตุผล (ถ้ามี)">
                  <textarea value={withdrawForm.reason} onChange={e => setWithdrawForm(f => ({ ...f, reason: e.target.value }))} rows={2} placeholder="ระบุเหตุผล" style={{ ...inputStyle, resize: "vertical" }} />
                </Field>
                <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                  <Btn type="submit" color="#ff6b6b" style={{ flex: 1 }}>✓ ยืนยันเบิก</Btn>
                  <Btn color="#333" onClick={() => { closeModal(); setWithdrawItem(null); }} style={{ flex: 1 }}>✕ ยกเลิก</Btn>
                </div>
              </form>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}