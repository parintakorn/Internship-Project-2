const multer = require('multer');
const path = require('path');

// ฟังก์ชันสร้าง storage ตาม path ที่ต้องการ
const createStorage = (uploadPath) => {
  return multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
      const uniqueName = Date.now() + '-' + file.originalname;
      cb(null, uniqueName);
    }
  });
};

// ตรวจสอบประเภทไฟล์ (ใช้ร่วมกันได้)
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('รองรับเฉพาะไฟล์รูปภาพ (JPG, PNG, GIF, WebP)'), false);
  }
};

// สร้าง multer instance แยกตามประเภท
const uploadProducts = multer({
  storage: createStorage('public/images/products/'),
  fileFilter: fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }
});

const uploadSlips = multer({
  storage: createStorage('public/images/slips/'),
  fileFilter: fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }
});

const uploadBanners = multer({
  storage: createStorage('public/images/banners/'),
  fileFilter: fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }
});

// export แบบ object เท่านั้น (ห้ามทับ!)
module.exports = {
  uploadProducts,
  uploadSlips,
  uploadBanners
  // ถ้ามีประเภทอื่น เช่น uploadPromotions, uploadAvatars เพิ่มตรงนี้ได้เลย
};
