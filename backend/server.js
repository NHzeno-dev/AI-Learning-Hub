const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '..', '.env') });
dotenv.config({ path: path.join(__dirname, '.env') });

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const authRoutes = require('./routes/auth');
const assignmentRoutes = require('./routes/assignments');
const aiRoutes = require('./routes/ai');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const port = Number(process.env.PORT || 3000);

app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(helmet({ crossOriginResourcePolicy: { policy: 'same-origin' } }));

const corsOrigin = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map(x => x.trim()).filter(Boolean)
  : true;
app.use(cors({ origin: corsOrigin, methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'] }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '100kb' }));
app.use(express.static(path.join(__dirname, '..', 'frontend'), { index: 'index.html' }));

app.get('/api/health', (_req, res) => res.json({
  ok: true,
  service: 'AI Learning Hub API',
  stage: 6,
  ai: Boolean(process.env.OPENAI_API_KEY),
  database: mongoose.connection.readyState === 1
}));

app.use('/api/auth', authRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/ai', aiRoutes);

app.use((req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ message: 'API route không tồn tại.', code: 'NOT_FOUND' });
  res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

app.use(errorHandler);

async function start() {
  if (!process.env.MONGODB_URI) throw new Error('Thiếu MONGODB_URI trong .env');
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) throw new Error('JWT_SECRET phải có ít nhất 32 ký tự.');
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✓ MongoDB connected');
  app.listen(port, '0.0.0.0', () => console.log(`✓ AI Learning Hub listening on port ${port}`));
}

if (require.main === module) {
  start().catch(err => {
    console.error('✗ Không thể khởi động:', err.message);
    process.exit(1);
  });
}

module.exports = { app, start };
