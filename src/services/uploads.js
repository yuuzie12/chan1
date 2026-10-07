const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const { v4: uuid } = require('uuid');

const UPLOAD_DIR = path.join(__dirname, '..', '..', 'data', 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: (Number(process.env.MAX_UPLOAD_MB) || 8) * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg','image/png','image/gif','image/webp'];
    cb(null, allowed.includes(file.mimetype));
  }
});

async function processImage(file) {
  if (!file) return null;
  const ext = file.mimetype === 'image/gif' ? 'gif' : 'webp';
  const name = `${uuid()}.${ext}`;
  const outPath = path.join(UPLOAD_DIR, name);

  if (file.mimetype === 'image/gif') {
    fs.writeFileSync(outPath, file.buffer);
  } else {
    await sharp(file.buffer)
      .resize({ width: 1600, withoutEnlargement: true })
      .webp({ quality: 82 })
      .toFile(outPath);
  }
  return name;
}
module.exports = { upload, processImage, UPLOAD_DIR };
