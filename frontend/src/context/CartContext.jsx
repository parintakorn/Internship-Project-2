import { createContext, useContext, useState, useEffect } from 'react';

const API_BASE = `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api`;

const CartContext = createContext();

export const useCart = () => {
    const context = useContext(CartContext);
    if (!context) {
        throw new Error('useCart must be used within CartProvider');
    }
    return context;
};

export const CartProvider = ({ children }) => {
    const [cartItems, setCartItems] = useState([]);
    const [isLoaded, setIsLoaded] = useState(false);
    const [promotions, setPromotions] = useState([]);

    // โหลดตะกร้าจาก localStorage
    useEffect(() => {
        try {
            const savedCart = localStorage.getItem('cart');
            if (savedCart) {
                const parsedCart = JSON.parse(savedCart);
                if (Array.isArray(parsedCart)) {
                    setCartItems(parsedCart);
                    console.log('Cart loaded from localStorage:', parsedCart);
                }
            }
        } catch (error) {
            console.error('Error loading cart from localStorage:', error);
            localStorage.removeItem('cart');
        } finally {
            setIsLoaded(true);
        }
    }, []);

    // ✅ โหลดโปรโมชั่น
    useEffect(() => {
        const fetchPromotions = async () => {
            try {
                const res = await fetch(`${API_BASE}/promotions`);
                if (res.ok) {
                    const data = await res.json();
                    setPromotions(Array.isArray(data) ? data : []);
                    console.log('✅ Promotions loaded:', data);
                }
            } catch (err) {
                console.error('❌ Error fetching promotions:', err);
                setPromotions([]);
            }
        };

        fetchPromotions();
    }, []);

    // บันทึกตะกร้า
    useEffect(() => {
        if (isLoaded) {
            try {
                localStorage.setItem('cart', JSON.stringify(cartItems));
                console.log('Cart saved to localStorage');
            } catch (error) {
                console.error('Error saving cart to localStorage:', error);
            }
        }
    }, [cartItems, isLoaded]);

    // ✅ หาโปรโมชั่น
    const getProductPromotion = (productId) => {
        const promo = promotions.find(p => p.product_id === productId);
        
        if (!promo) return null;
        
        const now = new Date();
        const start = promo.start_date ? new Date(promo.start_date) : null;
        const end = promo.end_date ? new Date(promo.end_date) : null;
        
        if (!start && !end) return promo;
        
        const isActive = (!start || now >= start) && (!end || now <= end);
        
        return isActive ? promo : null;
    };

    // ✅ คำนวณราคาหลังลด
    const calculateDiscountedPrice = (item) => {
        const promo = getProductPromotion(item.product_id);
        if (!promo) return Number(item.price);

        const originalPrice = Number(item.price);
        const discount = parseFloat(promo.discount_value || promo.discount_percentage || 0);
        
        if (promo.discount_type === 'percent') {
            return originalPrice * (1 - discount / 100);
        } else {
            return Math.max(0, originalPrice - discount);
        }
    };

    const addToCart = (product, quantity = 1) => {
        if (!product || !product.product_id) {
            console.error('Invalid product:', product);
            return;
        }

        if (quantity <= 0) {
            console.warn('Invalid quantity:', quantity);
            return;
        }

        setCartItems(prevItems => {
            const existingItem = prevItems.find(item => item.product_id === product.product_id);
            
            let newItems;
            if (existingItem) {
                newItems = prevItems.map(item =>
                    item.product_id === product.product_id
                        ? { ...item, quantity: item.quantity + quantity }
                        : item
                );
                console.log('Updated product quantity:', product.product_id);
            } else {
                newItems = [...prevItems, { ...product, quantity }];
                console.log('Added new product to cart:', product.product_id);
            }
            
            return newItems;
        });
    };

    const removeFromCart = (productId) => {
        setCartItems(prevItems => {
            const newItems = prevItems.filter(item => item.product_id !== productId);
            console.log('Removed product from cart:', productId);
            return newItems;
        });
    };

    const updateQuantity = (productId, quantity) => {
        if (quantity <= 0) {
            removeFromCart(productId);
            return;
        }
        
        setCartItems(prevItems => {
            const newItems = prevItems.map(item =>
                item.product_id === productId
                    ? { ...item, quantity: Math.max(1, quantity) }
                    : item
            );
            console.log('Updated quantity for product:', productId, 'to:', quantity);
            return newItems;
        });
    };

    const clearCart = () => {
        setCartItems([]);
        console.log('Cart cleared');
    };

    const getTotalPrice = () => {
        return cartItems.reduce((total, item) => {
            const price = Number(item.price) || 0;
            
            if (isNaN(price)) {
                console.warn('Invalid price for product:', item.product_id, item.price);
                return total;
            }
            
            return total + (price * item.quantity);
        }, 0);
    };

    // ✅ ยอดรวมหลังลด
    const getTotalWithPromotions = () => {
        return cartItems.reduce((total, item) => {
            const discountedPrice = calculateDiscountedPrice(item);
            return total + (discountedPrice * item.quantity);
        }, 0);
    };

    // ✅ ส่วนลดรวม
    const getTotalDiscount = () => {
        return getTotalPrice() - getTotalWithPromotions();
    };

    const getTotalItems = () => {
        return cartItems.reduce((total, item) => {
            const qty = Number(item.quantity) || 0;
            return total + qty;
        }, 0);
    };

    const value = {
        cartItems,
        promotions,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        getTotalPrice,
        getTotalWithPromotions,
        getTotalDiscount,
        getProductPromotion, // ✅ สำคัญมาก!
        calculateDiscountedPrice, // ✅ สำคัญมาก!
        getTotalItems,
        isLoaded,
    };

    return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};