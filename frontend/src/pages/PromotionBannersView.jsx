import React, { useState, useEffect } from 'react';
import './PromotionBannersView.css';

const API_BASE = 'http://192.168.1.113:3000';



const PromotionBannersView = () => {
    const [banners, setBanners] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [loading, setLoading] = useState(true);

    // 🔒 ล็อก scroll แค่หน้านี้
    useEffect(() => {
        
        const fetchBanners = async () => {
        try {
            console.log('🚀 fetching from:', `http://192.168.1.113:3000/api/banners`);
            
            const res = await fetch('http://192.168.1.113:3000/api/banners');
            
            console.log('📡 status:', res.status);
            
            const data = await res.json();
            
            console.log('📦 data:', JSON.stringify(data));
            
            const bannerList = Array.isArray(data) ? data : (data.banners || []);
            
            console.log('📋 bannerList:', JSON.stringify(bannerList));
            
            setBanners(bannerList);
            
        } catch (err) {
            console.error('❌ Error:', err.message);
        } finally {
            setLoading(false);
        }
    };
    fetchBanners();
    }, []);

    useEffect(() => {
        const fetchBanners = async () => {
            try {
                            console.log('🔑 VITE_API_URL =', import.meta.env.VITE_API_URL);

                // ⭐ เรียก /api/banners
                const res = await fetch(`${API_BASE}/api/banners`);
                const data = await res.json();
                console.log('📦 raw data:', data);
                // ⭐ รองรับทั้ง format เก่าและใหม่
                const bannerList = Array.isArray(data) ? data : (data.banners || []);
                
                // กรองเฉพาะแบนเนอร์ที่เปิดใช้งาน
                const activeBanners = bannerList;

                console.log('🖼️ image url =', activeBanners[0]?.image_url);
            console.log('🌐 full url =', `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}${activeBanners[0]?.image_url}`);
                setBanners(activeBanners);
                console.log('🖼️ activeBanners:', activeBanners);
            } catch (err) {
                console.error('Error fetching banners:', err);
                    alert('Error: ' + err.message);

            } finally {
                setLoading(false);
            }
        };
        fetchBanners();
    }, []);
    

    useEffect(() => {
        if (banners.length <= 1) return;
        const timer = setInterval(() => {
            setCurrentIndex(i => (i + 1) % banners.length);
        }, 5000);
        return () => clearInterval(timer);
    }, [banners]);

    if (loading) return <div style={{color:'white',background:'red',padding:'20px'}}>LOADING...</div>;
if (!banners.length) return <div style={{color:'white',background:'red',padding:'20px'}}>NO BANNERS</div>;

    return (
    <div style={{width:'100%', height:'calc(100vh - 70px)', background:'#000', overflow:'hidden', position:'relative'}}>
        {banners.map((b, i) => (
            <div
                key={b.id || i}
                style={{
                    position: 'absolute',
                    inset: 0,
                    opacity: i === currentIndex ? 1 : 0,
                    transition: 'opacity 0.8s ease',
                }}
            >
                <img
                    src={`http://192.168.1.113:3000${b.image_url}`}
                    alt={b.title || 'Banner'}
                    style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'contain',
                        display: 'block',
                    }}
                    onError={(e) => {
                        console.log('❌ image error:', e.target.src);
                        e.target.src = 'https://placehold.co/800x600/red/white?text=ERROR';
                    }}
                />
            </div>
        ))}
    </div>
);
};

export default PromotionBannersView;