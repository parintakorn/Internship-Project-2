require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { initDatabase } = require('./config/database');

const app = express();

/* =========================
   CORS CONFIG
========================= */
/* =========================
   CORS CONFIG
========================= */
const allowedOrigins = [
  'http://localhost:5173',
  'http://192.168.1.113:5173',  // PC
  // ✅ เพิ่ม — รองรับทุก device ใน network เดียวกัน
  /^http:\/\/192\.168\.\d+\.\d+:\d+$/,
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    
    // ✅ เช็คทั้ง string และ regex
    const allowed = allowedOrigins.some(o => 
      typeof o === 'string' ? o === origin : o.test(origin)
    );
    
    if (allowed) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked origin: ${origin}`);
      callback(new Error(`Origin ${origin} not allowed`));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* =========================
   Static files — mount ครั้งเดียว
========================= */
app.use('/images', (req, res, next) => {
  // ✅ เพิ่ม header ให้รองรับทุก origin
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  res.setHeader('Access-Control-Allow-Origin', '*');
  next();
}, express.static('public/images', { maxAge: '1d', etag: true }));

app.use('/images', (req, res, next) => {
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
}, express.static('public/images'));

/* =========================
   Init DB
========================= */
initDatabase().catch(err => {
  console.error('DB Init Failed:', err);
  process.exit(1);
});

/* =========================
   Routes
========================= */
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/payments', require('./routes/paymentRoutes'));
app.use('/api/admin', require('./routes/admin'));             // ✅ รวม warehouse ด้วย (/api/admin/warehouse/...)
const wc = require('./controllers/warehouseController');
app.get('/api/public/ingredient/:code', wc.getPublicIngredient);

app.use('/api/products', require('./routes/productRoutes'));
app.use('/api/cart', require('./routes/cartRoutes'));
app.use('/api/orders', require('./routes/orderRoutes'));
app.use('/api/promotions', require('./routes/promotionRoutes'));
app.use('/api/banners', require('./routes/bannerRoutes'));
app.use('/api/upload', require('./routes/uploadRoutes'));

/* =========================
   Health
========================= */
app.get('/', (req, res) => res.json({ message: 'API OK' }));
app.get('/health', (req, res) => res.json({ status: 'OK' }));

/* =========================
   Error handler
========================= */
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.message);
  res.status(500).json({ message: err.message });
});

/* =========================
   Start Server
========================= */
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 API running on port ${PORT}`);
});