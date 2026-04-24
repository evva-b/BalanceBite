const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = Number(process.env.PORT) || 3001;

const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map((origin) => origin.trim())
  : ['http://localhost:3000', 'http://localhost:5173'];

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  }),
);
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ status: 'OK' }));

// ============================================================================
// 🔗 ПОДКЛЮЧЕНИЕ РОУТОВ (без дубликатов!)
// ============================================================================
const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

app.use('/api/profile', require('./routes/profile'));
app.use('/api/meals', require('./routes/meals'));

// 🔥 Diary routes
const diaryRoutes = require('./routes/diary');
app.use('/api/diary', diaryRoutes);

// 🔥 Products routes — ПОДКЛЮЧАЕМ ОДИН РАЗ!
const productsRoutes = require('./routes/products');
app.use('/api/products', productsRoutes); // ← должна быть!
app.use('/api/diary/products', productsRoutes); // ← для модального окна поиска

// 🔥 Analytics routes
const analyticsRoutes = require('./routes/analytics');
app.use('/api/analytics', analyticsRoutes);

// ============================================================================
// 🚨 Обработчик ошибок (в конце, после всех роутов!)
// ============================================================================
app.use((error, req, res, next) => {
  console.error('Unhandled backend error:', error);
  if (res.headersSent) return next(error);
  return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
});

app.listen(PORT, () => console.log(`🚀 Бэкенд запущен на http://localhost:${PORT}`));
