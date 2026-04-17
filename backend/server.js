const express = require('express');
const cors = require('cors');
const app = express();

// Разрешаем запросы с React (по умолчанию localhost:5173 или 3000)
app.use(cors({ origin: ['http://localhost:3000', 'http://localhost:5173'] }));
app.use(express.json()); // Парсим JSON из запросов

// Пока просто заглушка
app.get('/api/health', (req, res) => res.json({ status: 'OK' }));

const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);
app.use('/api/profile', require('./routes/profile'));
app.use('/api/meals', require('./routes/meals'));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`🚀 Бэкенд запущен на http://localhost:${PORT}`));
