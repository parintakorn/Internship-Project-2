import api from '../api/axios';

const ProductCard = ({ product }) => {
    const handleAddToCart = async () => {
        try {
            await api.post('/cart/add', {
                product_id: product.product_id,
                quantity: 1
            });
            alert('เพิ่มสินค้าในตะกร้าแล้ว!');
        } catch (error) {
            console.error(error);
            alert('กรุณาเข้าสู่ระบบก่อน');
        }
    };

    return (
        <div style={styles.card}>
            <div style={styles.imagePlaceholder}>📦</div>
            <h3 style={styles.name}>{product.name}</h3>
            <p style={styles.price}>฿{product.price?.toLocaleString()}</p>
            <p style={styles.category}>{product.category_name || 'ไม่ระบุหมวดหมู่'}</p>
            <p style={styles.stock}>คงเหลือ: {product.stock} ชิ้น</p>
            <button onClick={handleAddToCart} style={styles.button}>
                เพิ่มลงตะกร้า
            </button>
        </div>
    );
};

const styles = {
    card: {
        border: '1px solid #ddd',
        borderRadius: '8px',
        padding: '1rem',
        textAlign: 'center',
        backgroundColor: 'white',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    },
    imagePlaceholder: {
        fontSize: '4rem',
        marginBottom: '1rem',
    },
    name: {
        fontSize: '1.1rem',
        marginBottom: '0.5rem',
    },
    price: {
        fontSize: '1.3rem',
        fontWeight: 'bold',
        color: '#ee4d2d',
        marginBottom: '0.5rem',
    },
    category: {
        color: '#666',
        marginBottom: '0.5rem',
    },
    stock: {
        color: '#888',
        fontSize: '0.9rem',
        marginBottom: '1rem',
    },
    button: {
        backgroundColor: '#ee4d2d',
        color: 'white',
        border: 'none',
        padding: '0.7rem 1.5rem',
        borderRadius: '4px',
        cursor: 'pointer',
        fontWeight: 'bold',
        width: '100%',
    },
};

export default ProductCard;