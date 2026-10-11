import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Ensure data and uploads directories exist
const dataDir = path.join(__dirname, 'data');
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// Multer storage for image uploads
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, 'product-' + uniqueSuffix + ext);
  }
});
const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit per image
});

// Database JSON file paths
const dbFile = path.join(dataDir, 'db.json');

interface Product {
  id: string;
  name: string;
  description: string;
  images: string[];
  affiliateUrl: string;
  createdAt: string;
}

interface Branding {
  siteName: string;
  fontFamily: string;
  fontStyle: string;
  isBold: boolean;
}

interface DB {
  products: Product[];
  branding: Branding;
  adminPasswordHash: string;
  activeSessions: string[];
}

const initialDB: DB = {
  adminPasswordHash: '03060666126ak',
  activeSessions: [],
  branding: {
    siteName: 'ZencuraPicks',
    fontFamily: 'Inter',
    fontStyle: 'normal',
    isBold: true
  },
  products: [
    {
      id: 'prod-1',
      name: 'Nova Pro Active Noise Cancelling Headphones',
      description: 'Experience crystal-clear studio acoustics and all-day comfort with industry-leading hybrid active noise cancellation, 40-hour battery life, and plush memory foam ear cushions.',
      images: [
        'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1484704849700-f032a568e944?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=1200&q=80'
      ],
      affiliateUrl: 'https://example.com/aff/nova-headphones',
      createdAt: new Date().toISOString()
    },
    {
      id: 'prod-2',
      name: 'Zenith Lumina Smart Desk Lamp',
      description: 'Elevate your workspace with auto-dimming circadian lighting, wireless phone charging base, touch-sensitive color temperature controls, and sleek minimalist aluminum alloy build.',
      images: [
        'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=1200&q=80'
      ],
      affiliateUrl: 'https://example.com/aff/zenith-lamp',
      createdAt: new Date().toISOString()
    },
    {
      id: 'prod-3',
      name: 'AuraFit Elite Smartwatch & Health Tracker',
      description: 'Monitor ECG, blood oxygen, sleep quality, and 100+ fitness modes with a stunning AMOLED retina display, titanium aerospace casing, and 7-day battery life.',
      images: [
        'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?auto=format&fit=crop&w=1200&q=80'
      ],
      affiliateUrl: 'https://example.com/aff/aurafit-watch',
      createdAt: new Date().toISOString()
    },
    {
      id: 'prod-4',
      name: 'Kura Minimalist Ergonomic Backpack',
      description: 'Crafted from weather-resistant ballistic nylon with dedicated padded laptop compartment, hidden anti-theft passport pocket, and sleek magnetic Fidlock buckles.',
      images: [
        'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1622560480605-d83c853bc5c3?auto=format&fit=crop&w=1200&q=80'
      ],
      affiliateUrl: 'https://example.com/aff/kura-backpack',
      createdAt: new Date().toISOString()
    },
    {
      id: 'prod-5',
      name: 'Solaria Ultrasonic Essential Oil Diffuser',
      description: 'Transform your home environment with whisper-quiet aromatherapy, soothing warm LED ambient flame simulation, auto shut-off, and BPA-free natural wood grain finish.',
      images: [
        'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=1200&q=80'
      ],
      affiliateUrl: 'https://example.com/aff/solaria-diffuser',
      createdAt: new Date().toISOString()
    },
    {
      id: 'prod-6',
      name: 'Nexus Portable Ultra-Slim SSD (2TB)',
      description: 'Lightning-fast file transfers up to 2000MB/s in a rugged, shock-resistant pocket-sized aluminum chassis. Perfect for 4K video editing and massive media libraries on the go.',
      images: [
        'https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1531492740964-2e5a40dd17a6?auto=format&fit=crop&w=1200&q=80'
      ],
      affiliateUrl: 'https://example.com/aff/nexus-ssd',
      createdAt: new Date().toISOString()
    }
  ]
};

function getDB(): DB {
  try {
    if (fs.existsSync(dbFile)) {
      const data = fs.readFileSync(dbFile, 'utf-8');
      const parsed = JSON.parse(data);
      return { 
        ...initialDB, 
        ...parsed, 
        adminPasswordHash: '03060666126ak',
        activeSessions: parsed.activeSessions || []
      };
    }
  } catch (e) {
    console.error('Error reading DB:', e);
  }
  saveDB(initialDB);
  return initialDB;
}

function saveDB(db: DB) {
  try {
    fs.writeFileSync(dbFile, JSON.stringify(db, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error saving DB:', e);
  }
}

const requireAdmin = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Admin access required' });
  }
  const token = authHeader.split(' ')[1];
  const db = getDB();
  if (!db.activeSessions || !db.activeSessions.includes(token)) {
    return res.status(401).json({ error: 'Unauthorized: Invalid or expired session' });
  }
  next();
};

app.get('/api/products', (_req, res) => {
  const db = getDB();
  res.json(db.products);
});

app.get('/api/products/:id', (req, res) => {
  const db = getDB();
  const product = db.products.find(p => p.id === req.params.id);
  if (!product) {
    return res.status(404).json({ error: 'Product not found' });
  }
  res.json(product);
});

app.get('/api/branding', (_req, res) => {
  const db = getDB();
  res.json(db.branding);
});

app.post('/api/admin/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const db = getDB();
  if (email.trim().toLowerCase() !== 'zencurapicks@gmail.com' || password !== db.adminPasswordHash) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const token = 'token-' + Date.now() + '-' + Math.random().toString(36).substring(2);
  if (!db.activeSessions) db.activeSessions = [];
  db.activeSessions.push(token);
  saveDB(db);
  res.json({ success: true, token, email });
});

app.post('/api/admin/logout', (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    const db = getDB();
    if (db.activeSessions) {
      db.activeSessions = db.activeSessions.filter(t => t !== token);
      saveDB(db);
    }
  }
  res.json({ success: true });
});

app.get('/api/admin/session', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.json({ authenticated: false });
  }
  const token = authHeader.split(' ')[1];
  const db = getDB();
  if (db.activeSessions && db.activeSessions.includes(token)) {
    return res.json({ authenticated: true, email: 'zencurapicks@gmail.com' });
  }
  res.json({ authenticated: false });
});

app.post('/api/products', requireAdmin, (req, res) => {
  const { name, description, images, affiliateUrl } = req.body;
  if (!name || !description || !images || !Array.isArray(images) || images.length === 0 || !affiliateUrl) {
    return res.status(400).json({ error: 'Missing required product fields' });
  }

  const db = getDB();
  const newProduct: Product = {
    id: 'prod-' + Date.now(),
    name: name.trim(),
    description: description.trim(),
    images,
    affiliateUrl: affiliateUrl.trim(),
    createdAt: new Date().toISOString()
  };

  db.products.unshift(newProduct);
  saveDB(db);
  res.status(201).json(newProduct);
});

app.put('/api/products/:id', requireAdmin, (req, res) => {
  const { name, description, images, affiliateUrl } = req.body;
  const db = getDB();
  const index = db.products.findIndex(p => p.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Product not found' });
  }

  const updated: Product = {
    ...db.products[index],
    name: name !== undefined ? name.trim() : db.products[index].name,
    description: description !== undefined ? description.trim() : db.products[index].description,
    images: images !== undefined ? images : db.products[index].images,
    affiliateUrl: affiliateUrl !== undefined ? affiliateUrl.trim() : db.products[index].affiliateUrl
  };

  db.products[index] = updated;
  saveDB(db);
  res.json(updated);
});

app.delete('/api/products/:id', requireAdmin, (req, res) => {
  const db = getDB();
  const index = db.products.findIndex(p => p.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Product not found' });
  }

  db.products.splice(index, 1);
  saveDB(db);
  res.json({ success: true });
});

app.put('/api/branding', requireAdmin, (req, res) => {
  const { siteName, fontFamily, fontStyle, isBold } = req.body;
  const db = getDB();
  db.branding = {
    siteName: siteName !== undefined ? siteName.trim() : db.branding.siteName,
    fontFamily: fontFamily !== undefined ? fontFamily : db.branding.fontFamily,
    fontStyle: fontStyle !== undefined ? fontStyle : db.branding.fontStyle,
    isBold: isBold !== undefined ? isBold : db.branding.isBold
  };
  saveDB(db);
  res.json(db.branding);
});

app.post('/api/upload', requireAdmin, upload.array('images', 10), (req, res) => {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }
    const urls = files.map(file => `/uploads/${file.filename}`);
    res.json({ urls });
  } catch (e) {
    console.error('Upload error:', e);
    res.status(500).json({ error: 'Failed to upload images' });
  }
});

app.post('/api/upload-base64', requireAdmin, (req, res) => {
  try {
    const { image } = req.body;
    if (!image || typeof image !== 'string') {
      return res.status(400).json({ error: 'No image data provided' });
    }
    const matches = image.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return res.status(400).json({ error: 'Invalid image data format' });
    }
    const ext = matches[1].split('/')[1] || 'jpeg';
    const buffer = Buffer.from(matches[2], 'base64');
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const filename = 'cropped-' + uniqueSuffix + '.' + (ext === 'png' ? 'png' : 'jpg');
    const filepath = path.join(uploadsDir, filename);
    fs.writeFileSync(filepath, buffer);
    res.json({ url: `/uploads/${filename}` });
  } catch (e) {
    console.error('Base64 upload error:', e);
    res.status(500).json({ error: 'Failed to process cropped image' });
  }
});

app.use('/uploads', express.static(uploadsDir));

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`ZencuraPicks server running on http://localhost:${PORT}`);
  });
}

startServer();
