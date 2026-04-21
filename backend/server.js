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

const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);
app.use('/api/profile', require('./routes/profile'));
app.use('/api/meals', require('./routes/meals'));

app.use((error, req, res, next) => {
  console.error('Unhandled backend error:', error);
  if (res.headersSent) return next(error);
  return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
});

app.listen(PORT, () => console.log(`🚀 Бэкенд запущен на http://localhost:${PORT}`));

app.get('/api/profile/metrics', (req, res) => {
    res.json({
        success: true,
        data: {
            height_cm: 175,
            weight_kg: 70,
            age: 25,
            gender: 'male',
            goal: 'Поддержание веса',
            daily_calorie_norm: 2009,
            bmi: 22.9,
            bmiCategory: 'Норма',
            healthyWeightRange: { min: 56.7, max: 76.3, unit: 'кг' },
            bmr: 1674
        }
    });
});
app.use('/api/profile', require('./routes/profile'));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/meals', require('./routes/meals'));
