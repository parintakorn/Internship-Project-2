import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';

// ========================================
// USER PAGES
// ========================================
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ProductsPage from './pages/ProductsPage';
import CartPage from './pages/CartPage';
import CheckoutPage from './pages/CheckoutPage';
import OrdersPage from './pages/OrdersPage';
import OrderDetailPage from './pages/OrderDetailPage';
import PaymentPage from './pages/PaymentPage';
import ProfilePage from './pages/ProfilePage';
import ContactPage from './pages/ContactPage';
import PromotionPage from './pages/PromotionPage';
import PromotionBannersView from './pages/PromotionBannersView';
import PublicInvoice from './pages/PublicInvoice/PublicInvoice';
import PublicIngredient from './pages/PublicIngredient/PublicIngredient';

// ========================================
// ADMIN PAGES
// ========================================
import AdminLayout from './pages/admin/AdminLayout';
import Dashboard from './pages/admin/Dashboard';
import Members from './pages/admin/Members';
import Orders from './pages/admin/Orders';
import Products from './pages/admin/Products';
import Promotions from './pages/admin/Promotions';
import Tiers from './pages/admin/Tiers';
import PromotionBannersAdmin from './pages/admin/PromotionBanners';
import MemberProfile from './pages/admin/MemberProfile';
import WarehouseDashboard from './pages/admin/WarehouseDashboard';
import IngredientQRManager from './pages/admin/IngredientQRManager';

// ✅ Warehouse Report Pages (เพิ่มใหม่)
import WarehouseReportDaily   from './pages/admin/WarehouseReportDaily';
import WarehouseReportMonthly from './pages/admin/WarehouseReportMonthly';
import WarehouseReportYearly  from './pages/admin/WarehouseReportYearly';

function App() {
    return (
        <AuthProvider>
            <CartProvider>
                <Router>
                    <Routes>
                        {/* ========================================
                            PUBLIC ROUTES (ไม่ต้อง Login)
                        ======================================== */}

                        <Route path="/" element={<><Navbar /><HomePage /></>} />
                        <Route path="/login" element={<><Navbar /><LoginPage /></>} />
                        <Route path="/register" element={<><Navbar /><RegisterPage /></>} />
                        <Route path="/products" element={<><Navbar /><ProductsPage /></>} />
                        <Route path="/promotions" element={<><Navbar /><PromotionPage /></>} />
                        <Route path="/promotion-banners" element={<><Navbar /><PromotionBannersView /></>} />
                        <Route path="/cart" element={<><Navbar /><CartPage /></>} />
                        <Route path="/contact" element={<><Navbar /><ContactPage /></>} />
                        <Route path="/invoice/:orderId" element={<PublicInvoice />} />
                        <Route path="/ingredient/:code" element={<PublicIngredient />} />

                        {/* ========================================
                            PROTECTED ROUTES (ต้อง Login)
                        ======================================== */}

                        <Route path="/profile" element={<><Navbar /><ProtectedRoute><ProfilePage /></ProtectedRoute></>} />
                        <Route path="/checkout" element={<><Navbar /><ProtectedRoute><CheckoutPage /></ProtectedRoute></>} />
                        <Route path="/orders" element={<><Navbar /><ProtectedRoute><OrdersPage /></ProtectedRoute></>} />
                        <Route path="/orders/:orderId" element={<><Navbar /><ProtectedRoute><OrderDetailPage /></ProtectedRoute></>} />
                        <Route path="/payment/:orderId" element={<><Navbar /><ProtectedRoute><PaymentPage /></ProtectedRoute></>} />

                        {/* ========================================
                            ADMIN ROUTES (ต้อง Login + role = admin)
                        ======================================== */}

                        <Route
                            path="/admin"
                            element={<AdminRoute><AdminLayout /></AdminRoute>}
                        >
                            <Route path="dashboard" element={<Dashboard />} />
                            <Route path="members" element={<Members />} />
                            <Route path="orders" element={<Orders />} />
                            <Route path="products" element={<Products />} />
                            <Route path="promotions" element={<Promotions />} />
                            <Route path="tiers" element={<Tiers />} />
                            <Route path="promotion-banners" element={<PromotionBannersAdmin />} />
                            <Route path="warehouse" element={<WarehouseDashboard />} />
                            <Route path="ingredients" element={<IngredientQRManager />} />

                            {/* ✅ Warehouse Reports (เพิ่มใหม่) */}
                            <Route path="warehouse/report/daily"   element={<WarehouseReportDaily />} />
                            <Route path="warehouse/report/monthly" element={<WarehouseReportMonthly />} />
                            <Route path="warehouse/report/yearly"  element={<WarehouseReportYearly />} />
                        </Route>

                        <Route
                            path="/admin/members/:userId/profile"
                            element={<AdminRoute><MemberProfile /></AdminRoute>}
                        />

                        {/* 404 */}
                        <Route path="*" element={
                            <>
                                <Navbar />
                                <div style={{
                                    minHeight: '100vh',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    backgroundColor: '#f5f5f5',
                                    padding: '2rem'
                                }}>
                                    <h1 style={{ fontSize: '72px', margin: 0 }}>404</h1>
                                    <p style={{ fontSize: '24px', color: '#666' }}>ไม่พบหน้าที่คุณต้องการ</p>
                                    <a href="/" style={{
                                        marginTop: '2rem',
                                        padding: '1rem 2rem',
                                        backgroundColor: '#007bff',
                                        color: 'white',
                                        textDecoration: 'none',
                                        borderRadius: '4px'
                                    }}>กลับหน้าหลัก</a>
                                </div>
                            </>
                        } />
                    </Routes>
                </Router>
            </CartProvider>
        </AuthProvider>
    );
}

export default App;