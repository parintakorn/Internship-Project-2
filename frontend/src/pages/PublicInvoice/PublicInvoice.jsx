import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../api/axios';

const PublicInvoice = () => {
  const { orderId } = useParams();
  const [orderData, setOrderData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ✅ เพิ่ม viewport meta tag
  useEffect(() => {
    // เพิ่ม viewport meta tag
    const viewport = document.querySelector('meta[name="viewport"]');
    if (!viewport) {
      const meta = document.createElement('meta');
      meta.name = 'viewport';
      meta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
      document.head.appendChild(meta);
    }

    // ✅ เพิ่ม Eruda Console สำหรับ debug บนมือถือ (ลบออกหลังแก้เสร็จ)
    if (window.innerWidth <= 768) {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/eruda';
      document.body.appendChild(script);
      script.onload = function () {
        window.eruda.init();
      };
    }
  }, []);

  useEffect(() => {
    fetchInvoiceData();
  }, [orderId]);

  // ✅ DEBUG: Log เมื่อข้อมูลเปลี่ยน
  useEffect(() => {
    if (orderData) {
      console.log('📦 Order Data:', orderData);
      console.log('📦 Items:', orderData.items);
      
      // คำนวณ totals เพื่อ log
      if (orderData.items && orderData.items.length > 0) {
        const totalWithVat = orderData.items.reduce((sum, item) => {
          const price = parseFloat(item.price_at_time || item.price || 0);
          const qty = parseInt(item.quantity || 0);
          return sum + (price * qty);
        }, 0);
        const vat = totalWithVat * 0.07 / 1.07;
        const subtotal = totalWithVat - vat;
        console.log('💰 Calculated:', { subtotal, vat, total: totalWithVat });
      }
    }
  }, [orderData]);

  const fetchInvoiceData = async () => {
  try {
    setLoading(true);
    
    const orderResponse = await api.get(`/invoice/${orderId}`);
    const responseData = orderResponse.data;
    
    // ✅ เปลี่ยนชื่อตัวแปรจาก orderData เป็น fetchedOrder เพื่อไม่ทับ state
    const fetchedOrder = responseData.order || responseData;
    fetchedOrder.items = responseData.items || [];
    fetchedOrder.payment = responseData.payment || null;
    
    fetchedOrder.customerDetails = {
      name: fetchedOrder.customer_name || 'ไม่ระบุชื่อ',
      phone: fetchedOrder.customer_phone || '-',
      address: fetchedOrder.shipping_address || fetchedOrder.address || 'ไม่มีข้อมูลที่อยู่',
      email: fetchedOrder.customer_email || '',
      district: fetchedOrder.district || '',
      province: fetchedOrder.province || '',
      postal_code: fetchedOrder.postal_code || ''
    };
    
    setOrderData(fetchedOrder); // ✅ set state ด้วยชื่อใหม่
    setLoading(false);
  } catch (error) {
    const errorMessage = error.response?.data?.error || 
                        error.response?.data?.message || 
                        error.message || 
                        'ไม่สามารถโหลดข้อมูลได้';
    setError(`ไม่พบข้อมูลใบกำกับภาษีนี้: ${errorMessage}`);
    setLoading(false);
    alert(`Error: ${errorMessage}\nOrder ID: ${orderId}`);
  }
};

  const getCalculatedTotals = () => {
    if (!orderData || !orderData.items) return { subtotal: '0.00', vat: '0.00', total: '0.00' };
    
    const totalWithVat = orderData.items.reduce((sum, item) => {
      const price = parseFloat(item.price_at_time || item.price || 0);
      const qty = parseInt(item.quantity || 0);
      return sum + (price * qty);
    }, 0);

    const vat = totalWithVat * 0.07 / 1.07;
    const subtotal = totalWithVat - vat;

    return {
      subtotal: subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      vat: vat.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      total: totalWithVat.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    };
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        backgroundColor: '#f5f7fa'
      }}>
        <div style={{
          width: '50px',
          height: '50px',
          border: '5px solid #e0e0e0',
          borderTop: '5px solid #2196f3',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
        <p style={{ marginTop: '20px', color: '#666', fontSize: '16px' }}>กำลังโหลดข้อมูล...</p>
      </div>
    );
  }

  if (error || !orderData) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        backgroundColor: '#f5f7fa'
      }}>
        <div style={{ fontSize: '64px', marginBottom: '20px' }}>❌</div>
        <h2 style={{ fontSize: '24px', color: '#d32f2f', marginBottom: '10px' }}>{error}</h2>
        <p style={{ color: '#666' }}>กรุณาตรวจสอบ QR Code อีกครั้ง</p>
      </div>
    );
  }

  const totals = getCalculatedTotals();

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f5f7fa',
      padding: window.innerWidth <= 768 ? '10px' : '20px',
      boxSizing: 'border-box'
    }}>
      {/* Print Button - Fixed Top Right */}
      <div className="no-print" style={{
        position: 'fixed',
        top: window.innerWidth <= 768 ? '10px' : '20px',
        right: window.innerWidth <= 768 ? '10px' : '20px',
        zIndex: 1000
      }}>
        <button 
          onClick={() => window.print()} 
          style={{
            padding: window.innerWidth <= 768 ? '8px 16px' : '12px 25px',
            backgroundColor: '#2196f3',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: window.innerWidth <= 768 ? '12px' : '14px',
            fontWeight: '600',
            boxShadow: '0 4px 12px rgba(33, 150, 243, 0.4)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <span style={{ fontSize: window.innerWidth <= 768 ? '14px' : '18px' }}>🖨️</span>
          พิมพ์ใบกำกับภาษี
        </button>
      </div>

      

      {/* Invoice Content */}
      <div style={{
        backgroundColor: '#F5E6D3',
        borderRadius: window.innerWidth <= 768 ? '0' : '8px',
        width: '100%',
        maxWidth: window.innerWidth <= 768 ? '100%' : '1300px',
        margin: window.innerWidth <= 768 ? '50px 0 0 0' : '0 auto',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
        border: '3px solid #C8A882',
        boxSizing: 'border-box'
      }}>
        
        {/* Header Section */}
        <div style={{
          padding: window.innerWidth <= 768 ? '10px' : '15px 20px',
          backgroundColor: '#F5E6D3',
          borderBottom: '2px solid #C8A882'
        }}>
          {/* Logo and Company Address Section */}
          <div style={{
            width: '100%',
            borderBottom: '2px solid #C8A882',
            paddingBottom: window.innerWidth <= 768 ? '10px' : '15px',
            marginBottom: window.innerWidth <= 768 ? '10px' : '15px',
            display: 'flex',
            flexDirection: window.innerWidth <= 768 ? 'column' : 'row',
            alignItems: 'flex-start',
            gap: window.innerWidth <= 768 ? '10px' : '20px'
          }}>
            {/* Logo */}
            <div style={{
              flex: '0 0 auto',
              display: window.innerWidth <= 768 ? 'flex' : 'block',
              justifyContent: 'center',
              width: window.innerWidth <= 768 ? '100%' : 'auto'
            }}>
              <img 
                src="/images/1212.jpg"
                alt="BIGURI Logo"
                style={{
                  width: window.innerWidth <= 768 ? '120px' : '200px',
                  height: window.innerWidth <= 768 ? '120px' : '200px',
                  objectFit: 'contain'
                }}
              />
            </div>
            
            {/* Company Address */}
            <div style={{
              flex: 1,
              fontSize: window.innerWidth <= 768 ? '11px' : '14px',
              color: '#333',
              lineHeight: '1.8',
              paddingTop: '5px',
              minWidth: 0, // ✅ FIX: ให้ flex item shrink ได้
              maxWidth: '100%' // ✅ FIX: ป้องกันล้น
            }}>
              <div style={{ 
                fontWeight: 'bold', 
                fontSize: window.innerWidth <= 768 ? '16px' : window.innerWidth <= 1024 ? '28px' : '36px', // ✅ FIX: ลดขนาดบน tablet
                marginBottom: window.innerWidth <= 768 ? '4px' : '8px', 
                color: '#000',
                lineHeight: '1.2',
                wordWrap: 'break-word', // ✅ FIX: ให้ขึ้นบรรทัดใหม่ถ้าจำเป็น
                overflowWrap: 'break-word' // ✅ FIX: รองรับทุก browser
              }}>
                BIGURI - PREMIUM JAPANESE FOOD
              </div>
              <div style={{ fontWeight: '600', color: '#000', fontSize: window.innerWidth <= 768 ? '11px' : '14px', marginBottom: '4px' }}>สำนักงานใหญ่</div>
              <div style={{ fontSize: window.innerWidth <= 768 ? '10px' : '14px', marginBottom: '2px' }}>52 ซอยรัชดาภิเษก 36 แยก11 แขวงจันทรเกษม เขตจตุจักร กรุงเทพมหานคร 10900</div>
              <div style={{ fontSize: window.innerWidth <= 768 ? '9px' : '13px', color: '#555', marginBottom: '6px' }}>Head office : 52 Ratchada 36 Yak 11 Chankasem, Chatuchak, Bangkok 10900</div>
              <div style={{ fontSize: window.innerWidth <= 768 ? '11px' : '14px' }}>
                <span style={{ fontWeight: '600' }}>โทร.</span> 0629532761
              </div>
              <div style={{ fontSize: window.innerWidth <= 768 ? '11px' : '14px' }}>
                <span style={{ fontWeight: '600' }}>เลขประจำตัวผู้เสียภาษี</span> {orderData.tax_id || '-'}
              </div>
            </div>

            {/* Facebook and LINE QR Code - Hide on mobile */}
            {window.innerWidth > 768 && (
              <div style={{
                flex: '0 0 auto',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '10px',
                paddingTop: '5px'
              }}>
                <div style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#000',
                  textAlign: 'center',
                  lineHeight: '1.4'
                }}>
                  Facebook : Biguri<br />วัตถุดิบอาหารญี่ปุ่นพรีเมียม
                </div>
                
                <div style={{
                  padding: '8px',
                  backgroundColor: '#fff',
                  border: '2px solid #C8A882',
                  borderRadius: '4px'
                }}>
                  <img 
                    src="/images/13541.jpg"
                    alt="LINE QR Code"
                    style={{
                      width: '150px',
                      height: '150px',
                      display: 'block'
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Customer and Document Info Section */}
          <div style={{
            display: 'flex',
            flexDirection: window.innerWidth <= 768 ? 'column' : 'row',
            gap: '15px'
          }}>
            {/* Left Section - Customer Info */}
            <div style={{ 
              flex: 1, 
              paddingRight: window.innerWidth <= 768 ? '0' : '15px', 
              borderRight: window.innerWidth <= 768 ? 'none' : '1px solid #C8A882',
              borderBottom: window.innerWidth <= 768 ? '1px solid #C8A882' : 'none',
              paddingBottom: window.innerWidth <= 768 ? '15px' : '0'
            }}>
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                fontSize: window.innerWidth <= 768 ? '11px' : '14px'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <span style={{ minWidth: window.innerWidth <= 768 ? '60px' : '80px', fontWeight: '600' }}>รหัสลูกค้า</span>
                  <span>BIGURI</span>
                </div>

                <div style={{ paddingLeft: window.innerWidth <= 768 ? '68px' : '88px', fontSize: window.innerWidth <= 768 ? '11px' : '14px', color: '#000', lineHeight: '1.8' }}>
                  {orderData.customerDetails?.name || orderData.customer_name || 'ไม่ระบุชื่อ'}
                  <br />
                  {(() => {
                    const address = orderData.customerDetails?.address || orderData.shipping_address;
                    if (!address) return 'ไม่มีข้อมูลที่อยู่';
                    
                    try {
                      if (typeof address === 'string' && address.startsWith('{')) {
                        const parsed = JSON.parse(address);
                        return parsed.full_address || address;
                      }
                      return address;
                    } catch (e) {
                      return address;
                    }
                  })()}
                </div>

                <div style={{ paddingLeft: window.innerWidth <= 768 ? '68px' : '88px', fontSize: window.innerWidth <= 768 ? '11px' : '14px', color: '#333' }}>
                  {(() => {
                    const address = orderData.customerDetails?.address || orderData.shipping_address;
                    const district = orderData.customerDetails?.district;
                    
                    if (district) return district;
                    
                    try {
                      if (typeof address === 'string' && address.startsWith('{')) {
                        const parsed = JSON.parse(address);
                        return parsed.district || 'อำนาจพระประแตง';
                      }
                    } catch (e) {}
                    
                    return 'อำนาจพระประแตง';
                  })()}
                </div>

                <div style={{ paddingLeft: window.innerWidth <= 768 ? '68px' : '88px', fontSize: window.innerWidth <= 768 ? '11px' : '14px', color: '#333' }}>
                  {(() => {
                    const address = orderData.customerDetails?.address || orderData.shipping_address;
                    let province = orderData.customerDetails?.province;
                    let postalCode = orderData.customerDetails?.postal_code;
                    
                    try {
                      if (typeof address === 'string' && address.startsWith('{')) {
                        const parsed = JSON.parse(address);
                        province = province || parsed.province;
                        postalCode = postalCode || parsed.postal_code;
                      }
                    } catch (e) {}
                    
                    province = province || 'สมุทรปรการ';
                    postalCode = postalCode || '';
                    
                    return `จังหวัด${province} ${postalCode}`;
                  })()}
                </div>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <span style={{ minWidth: window.innerWidth <= 768 ? '60px' : '80px' }}>โทร.</span>
                  <span>{orderData.customerDetails?.phone || orderData.customer_phone || '-'}</span>
                </div>
              </div>
            </div>

            {/* Right Section - Document Info */}
            <div style={{ 
              flex: window.innerWidth <= 768 ? 1 : 0,
              minWidth: window.innerWidth <= 768 ? '100%' : '500px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              fontSize: window.innerWidth <= 768 ? '10px' : '12px'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                justifyContent: 'flex-end'
              }}>
                <span style={{ minWidth: '60px', textAlign: 'right' }}>แยก</span>
                <span>ขาย2</span>
                <span style={{ marginLeft: '20px' }}>ขาย VAT</span>
              </div>

              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                justifyContent: 'flex-end'
              }}>
                <span style={{ minWidth: '80px', textAlign: 'right' }}>เลขที่เอกสาร</span>
                <span style={{ fontWeight: '600' }}>IV{String(orderData.order_id).padStart(7, '0')}</span>
                <span style={{ marginLeft: '15px', minWidth: '40px', textAlign: 'right' }}>วันที่</span>
                <span>{orderData.created_at ? new Date(orderData.created_at).toLocaleDateString('th-TH') : '-'}</span>
              </div>

              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                justifyContent: 'flex-end'
              }}>
                <span style={{ minWidth: '80px', textAlign: 'right' }}>เครดิต</span>
                <span>1 วัน</span>
                <span style={{ marginLeft: '10px', minWidth: '80px', textAlign: 'right' }}>ครบกำหนด</span>
                <span>{orderData.created_at ? new Date(new Date(orderData.created_at).getTime() + 86400000).toLocaleDateString('th-TH') : '-'}</span>
              </div>

              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                justifyContent: 'flex-end'
              }}>
                <span style={{ minWidth: '80px', textAlign: 'right' }}>พนักงานขาย</span>
                <span>35 - พนักงานลีพรมนมาดา</span>
              </div>

              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                justifyContent: 'flex-end'
              }}>
                <span style={{ minWidth: '80px', textAlign: 'right' }}>ประเภทราคา</span>
                <span>2 - แยก VAT</span>
              </div>
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div style={{
          backgroundColor: '#fff',
          margin: window.innerWidth <= 768 ? '10px' : '20px',
          padding: window.innerWidth <= 768 ? '10px' : '25px',
          border: '2px solid #C8A882',
          borderRadius: '4px',
          overflowX: 'auto'
        }}>
          <div style={{
            overflowX: 'auto',
            WebkitOverflowScrolling: 'touch'
          }}>
            <table style={{
              width: '100%',
              minWidth: window.innerWidth <= 768 ? '600px' : '100%',
              borderCollapse: 'collapse',
              border: '1px solid #999',
              marginBottom: '30px'
            }}>
            <thead>
              <tr style={{ backgroundColor: '#EEECE1' }}>
                <th style={{
                  padding: '10px 8px',
                  border: '1px solid #999',
                  fontSize: '13px',
                  fontWeight: 'bold',
                  color: '#000',
                  textAlign: 'center',
                  width: '50px'
                }}>No.</th>
                <th style={{
                  padding: '10px 8px',
                  border: '1px solid #999',
                  fontSize: '13px',
                  fontWeight: 'bold',
                  color: '#000',
                  textAlign: 'center',
                  width: '120px'
                }}>รหัส</th>
                <th style={{
                  padding: '10px 8px',
                  border: '1px solid #999',
                  fontSize: '13px',
                  fontWeight: 'bold',
                  color: '#000',
                  textAlign: 'center'
                }}>รายละเอียด</th>
                <th style={{
                  padding: '10px 8px',
                  border: '1px solid #999',
                  fontSize: '13px',
                  fontWeight: 'bold',
                  color: '#000',
                  textAlign: 'center',
                  width: '100px'
                }}>จำนวน</th>
                <th style={{
                  padding: '10px 8px',
                  border: '1px solid #999',
                  fontSize: '13px',
                  fontWeight: 'bold',
                  color: '#000',
                  textAlign: 'center',
                  width: '80px'
                }}>หน่วย</th>
                <th style={{
                  padding: '10px 8px',
                  border: '1px solid #999',
                  fontSize: '13px',
                  fontWeight: 'bold',
                  color: '#000',
                  textAlign: 'center',
                  width: '120px'
                }}>ราคา/หน่วย</th>
                <th style={{
                  padding: '10px 8px',
                  border: '1px solid #999',
                  fontSize: '13px',
                  fontWeight: 'bold',
                  color: '#000',
                  textAlign: 'center',
                  width: '100px'
                }}>ส่วนลด</th>
                <th style={{
                  padding: '10px 8px',
                  border: '1px solid #999',
                  fontSize: '13px',
                  fontWeight: 'bold',
                  color: '#000',
                  textAlign: 'center',
                  width: '130px'
                }}>จำนวนเงิน</th>
              </tr>
            </thead>
            <tbody>
              {orderData.items?.map((item, idx) => (
                <tr key={idx} style={{ backgroundColor: '#fff' }}>
                  <td style={{
                    padding: '6px 8px',
                    border: '1px solid #ddd',
                    fontSize: '13px',
                    color: '#000',
                    textAlign: 'center',
                    height: '32px'
                  }}>{idx + 1}</td>
                  <td style={{
                    padding: '6px 8px',
                    border: '1px solid #ddd',
                    fontSize: '13px',
                    color: '#000',
                    textAlign: 'center',
                    height: '32px'
                  }}>{item.product_id || '-'}</td>
                  <td style={{
                    padding: '6px 8px',
                    border: '1px solid #ddd',
                    fontSize: '13px',
                    color: '#000',
                    textAlign: 'left',
                    paddingLeft: '10px',
                    height: '32px'
                  }}>
                    {item.product_name || item.name}
                  </td>
                  <td style={{
                    padding: '6px 8px',
                    border: '1px solid #ddd',
                    fontSize: '13px',
                    color: '#000',
                    textAlign: 'right',
                    paddingRight: '10px',
                    height: '32px'
                  }}>
                    {parseFloat(item.quantity || 0).toLocaleString(undefined, {minimumFractionDigits: 3})}
                  </td>
                  <td style={{
                    padding: '6px 8px',
                    border: '1px solid #ddd',
                    fontSize: '13px',
                    color: '#000',
                    textAlign: 'center',
                    height: '32px'
                  }}>{item.unit || item.weight_unit || 'ชิ้น'}</td>
                  <td style={{
                    padding: '6px 8px',
                    border: '1px solid #ddd',
                    fontSize: '13px',
                    color: '#000',
                    textAlign: 'right',
                    paddingRight: '10px',
                    height: '32px'
                  }}>
                    {parseFloat(item.price_at_time || item.price || 0).toFixed(2)}
                  </td>
                  <td style={{
                    padding: '6px 8px',
                    border: '1px solid #ddd',
                    fontSize: '13px',
                    color: '#000',
                    textAlign: 'center',
                    height: '32px'
                  }}></td>
                  <td style={{
                    padding: '6px 8px',
                    border: '1px solid #ddd',
                    fontSize: '13px',
                    color: '#000',
                    textAlign: 'right',
                    paddingRight: '10px',
                    fontWeight: '500',
                    height: '32px'
                  }}>
                    {(parseFloat(item.price_at_time || item.price || 0) * item.quantity).toFixed(2)}
                  </td>
                </tr>
              ))}
              {[...Array(Math.max(0, 15 - (orderData.items?.length || 0)))].map((_, i) => (
                <tr key={`empty-${i}`} style={{ backgroundColor: '#fff' }}>
                  <td style={{
                    padding: '6px 8px',
                    border: '1px solid #ddd',
                    fontSize: '13px',
                    color: '#000',
                    textAlign: 'center',
                    height: '32px'
                  }}></td>
                  <td style={{ padding: '6px 8px', border: '1px solid #ddd', height: '32px' }}></td>
                  <td style={{ padding: '6px 8px', border: '1px solid #ddd', height: '32px' }}></td>
                  <td style={{ padding: '6px 8px', border: '1px solid #ddd', height: '32px' }}></td>
                  <td style={{ padding: '6px 8px', border: '1px solid #ddd', height: '32px' }}></td>
                  <td style={{ padding: '6px 8px', border: '1px solid #ddd', height: '32px' }}></td>
                  <td style={{ padding: '6px 8px', border: '1px solid #ddd', height: '32px' }}></td>
                  <td style={{ padding: '6px 8px', border: '1px solid #ddd', height: '32px' }}></td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>

          {/* QR Code + Payment Summary Section */}
<div style={{
  display: 'flex',
  gap: '20px',
  marginTop: '12px',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  flexDirection: window.innerWidth <= 768 ? 'column' : 'row'
}}>
            {/* QR Code Section */}
            <div style={{
              flex: '0 0 auto',
              width: window.innerWidth <= 768 ? '100%' : 'auto',
              display: 'flex',
              flexDirection: 'column',
              alignItems: window.innerWidth <= 768 ? 'center' : 'flex-start',
              gap: '8px'
            }}>
              <div style={{
                padding: '10px',
                backgroundColor: '#fff',
                border: '2px solid #C8A882',
                borderRadius: '4px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px'
              }}>
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${window.location.href}`}
                  alt="QR Code"
                  style={{
                    width: '120px',
                    height: '120px',
                    display: 'block'
                  }}
                />
                <div style={{
                  fontSize: '10px',
                  color: '#666',
                  fontWeight: '600',
                  textAlign: 'center'
                }}>
                  IV{String(orderData.order_id).padStart(7, '0')}
                </div>
              </div>

              {/* หมายเหตุ */}
              <div style={{
                fontSize: '9px',
                color: '#000',
                lineHeight: '1.6',
                maxWidth: '450px',
                marginTop: '5px'
              }}>
                <div style={{ 
                  fontWeight: 'bold', 
                  marginBottom: '4px',
                  fontSize: '10px'
                }}>
                  ***หมายเหตุ
                </div>
                <div style={{ marginBottom: '3px' }}>
                  1. โปรดตรวจสอบจำนวน คุณภาพ รายการในเอกสารนี้ ก่อนลงลายมือชื่อรับสินค้า เมื่อได้ลงลายมือชื่อแล้ว จะถือว่าการส่งมอบสินค้าและการรับสินค้า และเอกสารถูกต้องครบถ้วนแล้ว
                </div>
                <div style={{ marginBottom: '3px' }}>
                  2. กรณีสินค้ามีปัญหา ทางบริษัทฯ จะรับคืนสินค้าเมื่อสินค้าอยู่ในสภาพสมบูรณ์เท่านั้น
                </div>
                <div>
                  3. เงื่อนไขการเคลมสินค้า ภายใน 14 วันหลังจากวันส่งสินค้า
                </div>
              </div>
            </div>

            {/* Payment Summary Box - ✅ FINAL VERSION */}
<div style={{
  flex: '1',
  width: '100%',
  maxWidth: window.innerWidth <= 768 ? '100%' : '600px',
  boxSizing: 'border-box',
  backgroundColor: '#f0e6d6',
  border: '2px solid #C8A882',
  borderRadius: '4px',
  padding: window.innerWidth <= 768 ? '15px' : '12px'
}}>
  {/* รวมมูลค่าสินค้า */}
  <div style={{
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 6px',
    borderBottom: '1px solid #ddd'
  }}>
    <span style={{ 
      fontSize: window.innerWidth <= 768 ? '13px' : '11px', 
      color: '#000',
      fontWeight: '500'
    }}>
      รวมมูลค่าสินค้า <span style={{ fontSize: '10px', color: '#666' }}>(Sub Total)</span>
    </span>
    <span style={{ 
      fontSize: window.innerWidth <= 768 ? '17px' : '13px', 
      fontWeight: 'bold', 
      color: '#d32f2f',
      minWidth: '110px',
      textAlign: 'right'
    }}>
      {totals.subtotal}
    </span>
  </div>

  {/* ส่วนลด */}
  <div style={{
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 6px',
    borderBottom: '1px solid #ddd'
  }}>
    <span style={{ 
      fontSize: window.innerWidth <= 768 ? '12px' : '11px', 
      color: '#000',
      fontWeight: '500'
    }}>
      ส่วนลด <span style={{ fontSize: '10px', color: '#888' }}>(Discount)</span>
    </span>
    <span style={{ 
      fontSize: window.innerWidth <= 768 ? '14px' : '11px', 
      fontWeight: '600', 
      color: '#000',
      minWidth: '110px',
      textAlign: 'right'
    }}>
      0.00% / 0.00
    </span>
  </div>

  {/* มูลค่าหลังส่วนลด */}
  <div style={{
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 6px',
    borderBottom: '1px solid #ddd'
  }}>
    <span style={{ 
      fontSize: window.innerWidth <= 768 ? '12px' : '11px', 
      color: '#000',
      fontWeight: '500'
    }}>
      มูลค่าหลังส่วนลด <span style={{ fontSize: '10px', color: '#888' }}>(After discount)</span>
    </span>
    <span style={{ 
      fontSize: window.innerWidth <= 768 ? '17px' : '13px', 
      fontWeight: 'bold', 
      color: '#d32f2f',
      minWidth: '110px',
      textAlign: 'right'
    }}>
      {totals.subtotal}
    </span>
  </div>

  {/* ไม่มี VAT */}
  <div style={{
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 6px',
    borderBottom: '1px solid #ddd'
  }}>
    <span style={{ 
      fontSize: window.innerWidth <= 768 ? '12px' : '11px', 
      color: '#000',
      fontWeight: '500'
    }}>
      ไม่มี VAT <span style={{ fontSize: '10px', color: '#888' }}>(Non VAT)</span>
    </span>
    <span style={{ 
      fontSize: window.innerWidth <= 768 ? '14px' : '12px', 
      fontWeight: '600', 
      color: '#000',
      minWidth: '110px',
      textAlign: 'right'
    }}>
      0.00
    </span>
  </div>

  {/* รวม VAT */}
  <div style={{
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 6px',
    borderBottom: '1px solid #ddd'
  }}>
    <span style={{ 
      fontSize: window.innerWidth <= 768 ? '12px' : '11px', 
      color: '#000',
      fontWeight: '500'
    }}>
      รวม VAT <span style={{ fontSize: '10px', color: '#888' }}>(Include VAT)</span>
    </span>
    <span style={{ 
      fontSize: window.innerWidth <= 768 ? '17px' : '13px', 
      fontWeight: 'bold', 
      color: '#d32f2f',
      minWidth: '110px',
      textAlign: 'right'
    }}>
      {totals.subtotal}
    </span>
  </div>

  {/* ภาษี 7% */}
  <div style={{
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 6px',
    borderBottom: '2px solid #C8A882',
    marginBottom: '8px'
  }}>
    <span style={{ 
      fontSize: window.innerWidth <= 768 ? '12px' : '11px', 
      color: '#000',
      fontWeight: '500'
    }}>
      ภาษี 7% <span style={{ fontSize: '10px', color: '#888' }}>(VAT)</span>
    </span>
    <span style={{ 
      fontSize: window.innerWidth <= 768 ? '17px' : '13px', 
      fontWeight: 'bold', 
      color: '#d32f2f',
      minWidth: '110px',
      textAlign: 'right'
    }}>
      {totals.vat}
    </span>
  </div>

  {/* รวมทั้งสิ้น */}
  <div style={{
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: window.innerWidth <= 768 ? '14px 10px' : '12px 8px',
    backgroundColor: '#e8dcc8',
    borderRadius: '4px',
    marginBottom: '12px'
  }}>
    <div>
      <div style={{ 
        fontSize: window.innerWidth <= 768 ? '16px' : '13px', 
        fontWeight: 'bold', 
        color: '#000',
        marginBottom: '2px'
      }}>
        รวมทั้งสิ้น
      </div>
      <div style={{ 
        fontSize: window.innerWidth <= 768 ? '11px' : '10px', 
        fontWeight: 'normal', 
        color: '#666' 
      }}>
        Net Total
      </div>
    </div>
    <span style={{ 
      fontSize: window.innerWidth <= 768 ? '24px' : '18px', 
      fontWeight: 'bold', 
      color: '#d32f2f',
      minWidth: '130px',
      textAlign: 'right',
      letterSpacing: '0.5px'
    }}>
      {totals.total}
    </span>
  </div>

  {/* เส้นแบ่ง */}
  <div style={{
    height: '1px',
    backgroundColor: '#C8A882',
    margin: '12px 0'
  }}></div>

  {/* ส่วนจัดส่งสินค้า + ลูกค้า */}
  <div style={{
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: window.innerWidth <= 768 ? '12px' : '10px',
    alignItems: 'end'
  }}>
    <div>
      <div style={{
        fontSize: window.innerWidth <= 768 ? '12px' : '11px',
        fontWeight: 'bold',
        marginBottom: '6px',
        color: '#000'
      }}>จัดส่งสินค้า</div>
      <div style={{
        padding: window.innerWidth <= 768 ? '8px' : '6px',
        backgroundColor: '#fff',
        border: '1px solid #ddd',
        borderRadius: '3px',
        minHeight: window.innerWidth <= 768 ? '50px' : '45px'
      }}>
        <div style={{ 
          fontSize: window.innerWidth <= 768 ? '11px' : '10px', 
          fontWeight: '600',
          marginBottom: '4px',
          color: '#333'
        }}>
          ผู้ส่งของ
        </div>
        <div style={{ 
          fontSize: window.innerWidth <= 768 ? '10px' : '9px', 
          color: '#666'
        }}>
          วันที่ ___/___/___
        </div>
      </div>
    </div>

    <div>
      <div style={{
        fontSize: window.innerWidth <= 768 ? '12px' : '11px',
        fontWeight: 'bold',
        marginBottom: '6px',
        color: '#000'
      }}>ลูกค้า</div>
      <div style={{
        padding: window.innerWidth <= 768 ? '8px' : '6px',
        backgroundColor: '#fff',
        border: '1px solid #ddd',
        borderRadius: '3px',
        minHeight: window.innerWidth <= 768 ? '50px' : '45px'
      }}>
        <div style={{ 
          fontSize: window.innerWidth <= 768 ? '11px' : '10px', 
          fontWeight: '600',
          marginBottom: '4px',
          color: '#333'
        }}>
          ผู้รับของ
        </div>
        <div style={{ 
          fontSize: window.innerWidth <= 768 ? '10px' : '9px', 
          color: '#666'
        }}>
          วันที่ ___/___/___
        </div>
      </div>
    </div>
  </div>
</div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Print Styles + Mobile Responsive
const printStyle = document.createElement('style');
printStyle.textContent = `
  /* Mobile Responsive Styles */
  @media screen and (max-width: 768px) {
    body {
      padding: 0 !important;
      margin: 0 !important;
    }

    /* Main Container */
    body > div:first-child {
      padding: 10px !important;
    }

    /* Print Button */
    .no-print {
      position: fixed !important;
      top: 10px !important;
      right: 10px !important;
      z-index: 9999 !important;
    }

    .no-print button {
      padding: 8px 16px !important;
      font-size: 12px !important;
    }

    /* Invoice Container */
    body > div:first-child > div {
      max-width: 100% !important;
      border-radius: 0 !important;
      margin: 50px 0 0 0 !important;
    }

    /* Header Section */
    body > div:first-child > div > div:first-child {
      padding: 10px !important;
    }

    /* Logo and Company Section */
    body > div:first-child > div > div:first-child > div:first-child {
      flex-direction: column !important;
      gap: 10px !important;
    }

    /* Logo */
    body > div:first-child > div > div:first-child > div:first-child > div:first-child img {
      width: 120px !important;
      height: 120px !important;
    }

    /* Company Info */
    body > div:first-child > div > div:first-child > div:first-child > div:nth-child(2) {
      padding: 0 !important;
    }

    body > div:first-child > div > div:first-child > div:first-child > div:nth-child(2) > div:first-child {
      font-size: 18px !important;
    }

    body > div:first-child > div > div:first-child > div:first-child > div:nth-child(2) > div {
      font-size: 11px !important;
    }

    /* LINE QR Code */
    body > div:first-child > div > div:first-child > div:first-child > div:last-child {
      display: none !important;
    }

    /* Customer and Document Info */
    body > div:first-child > div > div:first-child > div:last-child {
      flex-direction: column !important;
      gap: 15px !important;
    }

    body > div:first-child > div > div:first-child > div:last-child > div {
      border-right: none !important;
      padding-right: 0 !important;
      min-width: 100% !important;
    }

    body > div:first-child > div > div:first-child > div:last-child > div > div {
      font-size: 11px !important;
    }

    /* Table Container */
    body > div:first-child > div > div:last-child {
      margin: 10px !important;
      padding: 10px !important;
      overflow-x: auto !important;
    }

    /* Table */
    table {
      font-size: 10px !important;
      min-width: 100% !important;
    }

    table th,
    table td {
      padding: 4px 2px !important;
      font-size: 9px !important;
    }

    /* QR and Summary Section */
    table + div + div {
      flex-direction: column !important;
      gap: 15px !important;
    }

    /* QR Code Section */
    table + div + div > div:first-child {
      width: 100% !important;
      align-items: center !important;
    }

    table + div + div > div:first-child > div:first-child img {
      width: 100px !important;
      height: 100px !important;
    }

    /* Payment Summary */
    table + div + div > div:last-child {
      width: 100% !important;
    }

    /* Hide some table columns on mobile */
    table th:nth-child(2),
    table td:nth-child(2),
    table th:nth-child(7),
    table td:nth-child(7) {
      display: none !important;
    }
  }

  /* ✅ Tablet Responsive - แก้ไขปัญหา header ล้นออกนอกกรอบ */
  @media screen and (min-width: 769px) and (max-width: 1400px) {
    body > div:first-child > div {
      max-width: 95% !important;
    }

    table {
      font-size: 11px !important;
    }

    /* ✅ ลดขนาด Logo */
    body > div:first-child > div > div:first-child > div:first-child > div:first-child img {
      width: 150px !important;
      height: 150px !important;
    }

    /* ✅ ลดขนาด Header ชื่อบริษัท */
    body > div:first-child > div > div:first-child > div:first-child > div:nth-child(2) > div:first-child {
      font-size: 24px !important;
    }
  }

  /* Print Styles */
  @page {
    size: A4 portrait;
    margin: 8mm 10mm;
  }

  @media print {
    body * { 
      visibility: hidden; 
    }
    
    body > div:first-child,
    body > div:first-child * { 
      visibility: visible !important; 
    }

    .no-print { 
      display: none !important; 
      visibility: hidden !important;
    }

    body > div:first-child {
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      width: 100vw !important;
      height: 100vh !important;
      background: white !important;
      padding: 0 !important;
      margin: 0 !important;
    }

    * {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
    }

    /* Show all columns when printing */
    table th,
    table td {
      display: table-cell !important;
    }
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

document.head.appendChild(printStyle);

export default PublicInvoice;
